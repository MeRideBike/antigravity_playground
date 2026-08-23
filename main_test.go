package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRouteWhitelist(t *testing.T) {
	handler := setupMux()

	allowedRoutes := []string{
		"/",
		"/index.html",
		"/style.css",
		"/app.js",
		"/theme-init.js",
		"/health",
		"/api/telemetry",
	}

	for _, route := range allowedRoutes {
		req := httptest.NewRequest(http.MethodGet, route, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("Expected route %q to return 200 OK, got %d", route, rec.Code)
		}
	}
}

func TestVirtualFSServing(t *testing.T) {
	handler := setupMux()

	// Verify index.html content served directly from embed.FS
	req := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for /index.html from embed.FS, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "E.'s Dev Dashboard") {
		t.Errorf("Expected /index.html to contain 'E.'s Dev Dashboard', got: %s", body)
	}

	// Verify style.css content
	req = httptest.NewRequest(http.MethodGet, "/style.css", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), ":root") {
		t.Errorf("Expected /style.css to be served properly from embed.FS")
	}

	// Verify app.js content
	req = httptest.NewRequest(http.MethodGet, "/app.js", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "MetricCalculator") {
		t.Errorf("Expected /app.js to be served properly from embed.FS")
	}

	// Verify theme-init.js content
	req = httptest.NewRequest(http.MethodGet, "/theme-init.js", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "dashboard_theme") {
		t.Errorf("Expected /theme-init.js to be served properly from embed.FS")
	}
}

func TestBlockedAssets(t *testing.T) {
	handler := setupMux()

	blockedPaths := []string{
		"/main.go",
		"/main_test.go",
		"/server.exe",
		"/test_dashboard.js",
		"/README.md",
		"/AGENTS.md",
		"/.git/config",
		"/.agents/rules/security.md",
		"/docs/architecture.md",
		"/non-existent-file.html",
		"/app.js.map",
	}

	for _, path := range blockedPaths {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("Expected protected/blocked path %q to return 404 Not Found, got %d", path, rec.Code)
		}
	}
}

func TestMethodRestrictions(t *testing.T) {
	handler := setupMux()

	disallowedMethods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

	// 1. Static asset method check
	for _, method := range disallowedMethods {
		req := httptest.NewRequest(method, "/index.html", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected %s /index.html to return 405 Method Not Allowed, got %d", method, rec.Code)
		}
	}

	// 2. Health & Telemetry method check
	for _, method := range disallowedMethods {
		req := httptest.NewRequest(method, "/health", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected %s /health to return 405 Method Not Allowed, got %d", method, rec.Code)
		}

		req = httptest.NewRequest(method, "/api/telemetry", nil)
		rec = httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected %s /api/telemetry to return 405 Method Not Allowed, got %d", method, rec.Code)
		}
	}

	// 3. GC endpoint method check (only POST allowed)
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		req := httptest.NewRequest(method, "/api/gc", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("Expected %s /api/gc to return 405 Method Not Allowed, got %d", method, rec.Code)
		}
	}

	postReq := httptest.NewRequest(http.MethodPost, "/api/gc", nil)
	postRec := httptest.NewRecorder()
	handler.ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusOK {
		t.Errorf("Expected POST /api/gc to return 200 OK, got %d", postRec.Code)
	}
}

func TestSecFetchPolicy(t *testing.T) {
	handler := setupMux()

	// 1. Same-origin request -> Allowed
	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected same-origin request to succeed 200, got %d", rec.Code)
	}

	// 2. Direct browser navigation ("none") -> Allowed
	req = httptest.NewRequest(http.MethodGet, "/index.html", nil)
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected direct navigation to succeed 200, got %d", rec.Code)
	}

	// 3. Cross-site top-level navigation -> Allowed
	req = httptest.NewRequest(http.MethodGet, "/index.html", nil)
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("Expected cross-site top navigation to succeed 200, got %d", rec.Code)
	}

	// 4. Cross-site API telemetry fetch -> Blocked (403 Forbidden)
	req = httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("Expected cross-site telemetry request to be blocked 403, got %d", rec.Code)
	}

	// 5. Cross-site POST /api/gc -> Blocked (403 Forbidden)
	req = httptest.NewRequest(http.MethodPost, "/api/gc", nil)
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("Expected cross-site POST /api/gc to be blocked 403, got %d", rec.Code)
	}
}

func TestRateLimiter(t *testing.T) {
	limiter := newIPRateLimiter(3, 1*time.Minute)
	handler := setupMuxWithLimiter(limiter)

	// First 3 requests from 192.168.1.50 must succeed
	for i := 1; i <= 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.RemoteAddr = "192.168.1.50:12345"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("Request %d expected 200 OK, got %d", i, rec.Code)
		}
	}

	// 4th request from same IP must be rate limited (429)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.RemoteAddr = "192.168.1.50:12345"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 4th request to return 429 Too Many Requests, got %d", rec.Code)
	}
	if rec.Header().Get("Retry-After") != "60" {
		t.Errorf("Expected Retry-After: 60 header on 429 response")
	}

	// Request from distinct IP must succeed
	distinctReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	distinctReq.RemoteAddr = "10.0.0.1:54321"
	distinctRec := httptest.NewRecorder()
	handler.ServeHTTP(distinctRec, distinctReq)

	if distinctRec.Code != http.StatusOK {
		t.Errorf("Expected distinct IP request to return 200 OK, got %d", distinctRec.Code)
	}

	// Verify cleanup method
	limiter.cleanup()
}

func TestSecurityHeaders(t *testing.T) {
	handler := setupMux()

	endpoints := []string{"/index.html", "/health", "/api/telemetry"}

	for _, ep := range endpoints {
		req := httptest.NewRequest(http.MethodGet, ep, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		// Check CSP with Trusted Types
		csp := rec.Header().Get("Content-Security-Policy")
		if !strings.Contains(csp, "default-src 'self'") || !strings.Contains(csp, "frame-ancestors 'none'") ||
			!strings.Contains(csp, "object-src 'none'") || !strings.Contains(csp, "require-trusted-types-for 'script'") ||
			!strings.Contains(csp, "trusted-types default dashboardPolicy") {
			t.Errorf("Endpoint %q missing comprehensive CSP / Trusted Types directives, got: %q", ep, csp)
		}

		// Check nosniff
		if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("Endpoint %q missing X-Content-Type-Options: nosniff", ep)
		}

		// Check X-Frame-Options
		if rec.Header().Get("X-Frame-Options") != "DENY" {
			t.Errorf("Endpoint %q missing X-Frame-Options: DENY", ep)
		}

		// Check Referrer-Policy
		if rec.Header().Get("Referrer-Policy") != "strict-origin-when-cross-origin" {
			t.Errorf("Endpoint %q missing Referrer-Policy: strict-origin-when-cross-origin", ep)
		}

		// Check Permissions-Policy
		if rec.Header().Get("Permissions-Policy") == "" {
			t.Errorf("Endpoint %q missing Permissions-Policy header", ep)
		}

		// Check Cross-Origin Isolation headers
		if rec.Header().Get("Cross-Origin-Opener-Policy") != "same-origin" {
			t.Errorf("Endpoint %q missing Cross-Origin-Opener-Policy: same-origin", ep)
		}
		if rec.Header().Get("Cross-Origin-Resource-Policy") != "same-origin" {
			t.Errorf("Endpoint %q missing Cross-Origin-Resource-Policy: same-origin", ep)
		}
	}
}

func TestPathTraversalFuzzing(t *testing.T) {
	handler := setupMux()

	traversalPayloads := []string{
		"/..%2fmain.go",
		"/%2e%2e/style.css",
		"/index.html%00",
		"/../main.go",
		"/../../etc/passwd",
		"/..\\main.go",
	}

	for _, payload := range traversalPayloads {
		req := httptest.NewRequest(http.MethodGet, payload, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("Expected path traversal payload %q to return 404 Not Found, got %d", payload, rec.Code)
		}
	}
}

func TestHealthAndTelemetryPayloads(t *testing.T) {
	handler := setupMux()

	// 1. Health Payload
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var healthData map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &healthData); err != nil {
		t.Fatalf("Failed to decode /health JSON: %v", err)
	}
	if healthData["status"] != "online" {
		t.Errorf("Expected health status 'online', got %v", healthData["status"])
	}

	// 2. Telemetry Payload
	req = httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var teleData map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &teleData); err != nil {
		t.Fatalf("Failed to decode /api/telemetry JSON: %v", err)
	}
	if teleData["status"] != "online" {
		t.Errorf("Expected telemetry status 'online', got %v", teleData["status"])
	}
	if _, ok := teleData["allocMB"]; !ok {
		t.Errorf("Expected allocMB field in telemetry payload")
	}
	if _, ok := teleData["goroutines"]; !ok {
		t.Errorf("Expected goroutines field in telemetry payload")
	}
}

// BenchmarkVirtualFSRouting measures virtual filesystem route dispatching and static asset delivery throughput.
func BenchmarkVirtualFSRouting(b *testing.B) {
	handler := setupMux()
	req := httptest.NewRequest(http.MethodGet, "/index.html", nil)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}
}

// BenchmarkRateLimiterContention measures token bucket thread-safety and latency under high parallel goroutine contention.
func BenchmarkRateLimiterContention(b *testing.B) {
	limiter := newIPRateLimiter(1000000, 1*time.Minute)

	b.ReportAllocs()
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		ip := "192.168.1.100"
		for pb.Next() {
			limiter.allow(ip)
		}
	})
}

// BenchmarkTelemetryJSONGeneration measures real-time runtime memory stats extraction and serialization.
func BenchmarkTelemetryJSONGeneration(b *testing.B) {
	handler := setupMux()
	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}
}
