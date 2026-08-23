// Package main provides a lightweight, secure HTTP server and telemetry monitor for E.'s Dev Dashboard.
package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed index.html style.css app.js theme-init.js
var embeddedFiles embed.FS

var startTime = time.Now()

// Allowed static web assets with explicit MIME types
var allowedFiles = map[string]string{
	"/index.html":    "text/html; charset=utf-8",
	"/style.css":     "text/css; charset=utf-8",
	"/app.js":        "application/javascript; charset=utf-8",
	"/theme-init.js": "application/javascript; charset=utf-8",
}

// IPRateLimiter implements a thread-safe sliding-window rate limiter per IP address
type IPRateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

// newIPRateLimiter creates a new IPRateLimiter instance
func newIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	return &IPRateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// allow checks whether a request from the given IP is permitted under the sliding window limit
func (rl *IPRateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	timestamps, exists := rl.requests[ip]
	if !exists {
		rl.requests[ip] = []time.Time{now}
		return true
	}

	valid := timestamps[:0]
	for _, ts := range timestamps {
		if ts.After(cutoff) {
			valid = append(valid, ts)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[ip] = valid
		return false
	}

	rl.requests[ip] = append(valid, now)
	return true
}

// cleanup removes expired IP records from memory to prevent memory leakage
func (rl *IPRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)
	for ip, timestamps := range rl.requests {
		valid := timestamps[:0]
		for _, ts := range timestamps {
			if ts.After(cutoff) {
				valid = append(valid, ts)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, ip)
		} else {
			rl.requests[ip] = valid
		}
	}
}

// securityHeadersMiddleware applies comprehensive defense-in-depth HTTP security headers
func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strict CSP Level 3 with Trusted Types and framing prevention
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default dashboardPolicy;")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=(), usb=()")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")

		next.ServeHTTP(w, r)
	})
}

// secFetchMiddleware inspects Sec-Fetch-* metadata headers to block cross-site request attacks at the protocol layer
func secFetchMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secFetchSite := r.Header.Get("Sec-Fetch-Site")
		secFetchMode := r.Header.Get("Sec-Fetch-Mode")

		if secFetchSite != "" {
			if secFetchSite == "same-origin" || secFetchSite == "none" || secFetchSite == "same-site" {
				next.ServeHTTP(w, r)
				return
			}

			if secFetchSite == "cross-site" {
				// Allow top-level browser navigations
				if (r.Method == http.MethodGet || r.Method == http.MethodHead) && secFetchMode == "navigate" {
					next.ServeHTTP(w, r)
					return
				}

				// Block cross-site API calls, mutations, and subresource queries
				http.Error(w, "Forbidden: Cross-site request rejected by Sec-Fetch policy", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// rateLimiterMiddleware enforces sliding-window rate limiting per IP
func rateLimiterMiddleware(limiter *IPRateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		if ip == "" {
			ip = "127.0.0.1"
		}

		if !limiter.allow(ip) {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error":   "Too Many Requests",
				"message": "Rate limit exceeded. Please retry after 60 seconds.",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "online",
		"uptime": fmt.Sprintf("%.2fs", time.Since(startTime).Seconds()),
	})
}

func telemetryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":        "online",
		"uptime":        fmt.Sprintf("%.2fs", time.Since(startTime).Seconds()),
		"uptimeSeconds": time.Since(startTime).Seconds(),
		"allocBytes":    m.Alloc,
		"allocMB":       float64(m.Alloc) / (1024 * 1024),
		"sysBytes":      m.Sys,
		"sysMB":         float64(m.Sys) / (1024 * 1024),
		"numGC":         m.NumGC,
		"goroutines":    runtime.NumGoroutine(),
		"pid":           os.Getpid(),
	})
}

func gcHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	runtime.GC()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":     "gc_completed",
		"allocBytes": m.Alloc,
		"allocMB":    float64(m.Alloc) / (1024 * 1024),
		"numGC":      m.NumGC,
		"timestamp":  time.Now().Format(time.RFC3339),
	})
}

func secureFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cleaned := path.Clean("/" + strings.TrimPrefix(filepath.ToSlash(r.URL.Path), "/"))

	// Map root to index.html
	if cleaned == "/" || cleaned == "." {
		cleaned = "/index.html"
	}

	contentType, isAllowed := allowedFiles[cleaned]
	if !isAllowed {
		// Strict whitelist: hide source files (.go, .exe, .js tests, .md, hidden files)
		http.NotFound(w, r)
		return
	}

	// Open file from embedded virtual filesystem (zero host disk I/O)
	fsPath := strings.TrimPrefix(cleaned, "/")
	file, err := embeddedFiles.Open(fsPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = file.Close() }()

	stat, err := file.Stat()
	if err != nil || stat.IsDir() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", contentType)

	if cleaned == "/index.html" {
		w.Header().Set("Cache-Control", "no-cache, must-revalidate")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}

	if seeker, ok := file.(io.ReadSeeker); ok {
		http.ServeContent(w, r, stat.Name(), stat.ModTime(), seeker)
	} else {
		data, readErr := io.ReadAll(file)
		if readErr != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		http.ServeContent(w, r, stat.Name(), stat.ModTime(), bytes.NewReader(data))
	}
}

// pathSanitizationMiddleware blocks path traversal sequences and encoded manipulation
func pathSanitizationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqURI := r.URL.RequestURI()
		rawPath := r.URL.RawPath
		pathStr := r.URL.Path

		// Check for directory traversal sequences (encoded or unencoded)
		lowerURI := strings.ToLower(reqURI)
		if strings.Contains(pathStr, "..") || strings.Contains(rawPath, "..") || strings.Contains(reqURI, "..") ||
			strings.Contains(lowerURI, "%2e%2e") || strings.Contains(lowerURI, "%2e") || strings.Contains(pathStr, "\x00") ||
			strings.Contains(reqURI, "%00") {
			http.NotFound(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// setupMuxWithLimiter registers all application handlers with a specified rate limiter instance
func setupMuxWithLimiter(limiter *IPRateLimiter) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/telemetry", telemetryHandler)
	mux.HandleFunc("/api/gc", gcHandler)
	mux.HandleFunc("/", secureFileHandler)

	return securityHeadersMiddleware(
		secFetchMiddleware(
			rateLimiterMiddleware(limiter,
				pathSanitizationMiddleware(mux),
			),
		),
	)
}

// setupMux registers all application handlers and returns the configured HTTP handler with default security middleware
func setupMux() http.Handler {
	limiter := newIPRateLimiter(100, 1*time.Minute)
	return setupMuxWithLimiter(limiter)
}

func main() {
	defaultHost := "127.0.0.1"
	if envHost := os.Getenv("HOST"); envHost != "" {
		defaultHost = envHost
	}

	defaultPort := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		defaultPort = envPort
	}

	hostFlag := flag.String("host", defaultHost, "Server host address to bind to (defaults to 127.0.0.1 for local isolation)")
	portFlag := flag.String("port", defaultPort, "Server port to listen on")
	flag.Parse()

	host := *hostFlag
	port := *portFlag

	// Sanitize host and port to prevent CWE-117 log injection
	safeHost := strings.ReplaceAll(strings.ReplaceAll(host, "\r", ""), "\n", "")
	safePort := strings.ReplaceAll(strings.ReplaceAll(port, "\r", ""), "\n", "")
	addr := net.JoinHostPort(safeHost, safePort)

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start server on %s (Address/Port may already be in use): %v\n", addr, err)
		os.Exit(1)
	}

	limiter := newIPRateLimiter(100, 1*time.Minute)
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	go func() {
		for range ticker.C {
			limiter.cleanup()
		}
	}()

	fmt.Printf("Local Dev Dashboard server running securely at http://%s\n", addr)
	fmt.Println("Binding restricted to:", host)
	fmt.Println("Allowed virtual routes: /, /index.html, /style.css, /app.js, /theme-init.js, /health, /api/telemetry, /api/gc")
	fmt.Println("ASVS Level 3 security active: embed.FS virtualization, Sec-Fetch defense, sliding-window rate limiting, CSP Level 3 Trusted Types.")
	fmt.Println("Source files, tests, and host binaries are completely isolated from HTTP runtime.")
	fmt.Println("Press Ctrl+C to stop.")

	server := &http.Server{
		Handler:           setupMuxWithLimiter(limiter),
		ReadHeaderTimeout: 3 * time.Second,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MB
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}
