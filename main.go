package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

var startTime = time.Now()

// Allowed static web assets with explicit MIME types
var allowedFiles = map[string]string{
	"/index.html":    "text/html; charset=utf-8",
	"/style.css":     "text/css; charset=utf-8",
	"/app.js":        "application/javascript; charset=utf-8",
	"/theme-init.js": "application/javascript; charset=utf-8",
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("X-Content-Type-Options", "nosniff")
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
	w.Header().Set("X-Content-Type-Options", "nosniff")

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
	w.Header().Set("X-Content-Type-Options", "nosniff")

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

	cleaned := filepath.ToSlash(filepath.Clean(r.URL.Path))

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

	localPath := filepath.Join(".", filepath.FromSlash(cleaned))
	file, err := os.Open(localPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil || stat.IsDir() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if cleaned == "/index.html" {
		w.Header().Set("Cache-Control", "no-cache, must-revalidate")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}

	http.ServeContent(w, r, stat.Name(), stat.ModTime(), file)
}

func main() {
	defaultPort := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		defaultPort = envPort
	}

	portFlag := flag.String("port", defaultPort, "Server port to listen on")
	flag.Parse()

	port := *portFlag

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/telemetry", telemetryHandler)
	mux.HandleFunc("/api/gc", gcHandler)
	mux.HandleFunc("/", secureFileHandler)

	addr := ":" + port
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("Failed to start server on port %s (Port may already be in use): %v\n", port, err)
	}

	fmt.Printf("Local Dev Dashboard server running at http://localhost:%s\n", port)
	fmt.Println("Allowed routes: /, /index.html, /style.css, /app.js, /theme-init.js, /health, /api/telemetry, /api/gc")
	fmt.Println("Source files, tests, and binaries are restricted from HTTP access.")
	fmt.Println("Press Ctrl+C to stop.")

	server := &http.Server{
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v\n", err)
	}
}
