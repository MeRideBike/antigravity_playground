# Rule: Security Policies

**Status**: Always On  
**Scope**: Server network binding, routing, HTTP response headers, client input sanitization

---

## Mandatory Security Standards

1. **Network Interface Binding (Loopback Isolation)**:
   - `main.go` MUST default its listening address to `127.0.0.1` (loopback) to prevent accidental intranet/LAN exposure.
   - Any external binding requires explicit developer override via the `-host` CLI flag or `HOST` environment variable.

2. **Virtualized Filesystem (`embed.FS`) & Host Isolation**:
   - `main.go` MUST embed static web assets (`index.html`, `style.css`, `app.js`, `theme-init.js`) directly into the compiled binary via `//go:embed`.
   - `secureFileHandler` MUST NOT execute runtime host filesystem reads (`os.Open` prohibited for static asset serving).

3. **Unified HTTP Security Headers & W3C Trusted Types**:
   - 100% of HTTP responses MUST include comprehensive defense-in-depth security headers via middleware:
     - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default dashboardPolicy;`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()`
     - `Cross-Origin-Opener-Policy: same-origin`
     - `Cross-Origin-Resource-Policy: same-origin`
   - `index.html` MUST maintain a matching `<meta http-equiv="Content-Security-Policy">` tag.
   - `app.js` MUST register a W3C Trusted Types `default` policy that forbids dynamic HTML string sinks.

4. **Sec-Fetch Protocol-Level Defense**:
   - `main.go` MUST validate incoming `Sec-Fetch-*` headers via `secFetchMiddleware`.
   - Cross-site requests targeting API endpoints (`/api/telemetry`) or state mutations (`POST /api/gc`) MUST be rejected with `403 Forbidden`. Top-level user navigations (`Sec-Fetch-Mode: navigate`) are permitted.

5. **In-Memory Sliding-Window Rate Limiting**:
   - `main.go` MUST enforce per-IP sliding-window rate limiting (`IPRateLimiter`) on HTTP requests, returning `429 Too Many Requests` with `Retry-After: 60` upon exhaustion to prevent DoS or thread starvation.

6. **Backend Route & Method Whitelisting**:
   - `main.go` MUST only serve explicitly whitelisted virtual assets (`/index.html`, `/style.css`, `/app.js`, `/theme-init.js`) and registered APIs (`/health`, `/api/telemetry`, `POST /api/gc`).
   - Source code, binaries, configuration files, test scripts, and hidden directories MUST return `404 Not Found`.
   - Non-allowed HTTP methods MUST return `405 Method Not Allowed`.
   - Path traversal attempts (`..`, `%2e%2e`, `%00`) MUST be blocked with `404 Not Found`.

7. **HTTP Server DoS Hardening**:
   - The Go HTTP server MUST configure explicit timeouts: `ReadHeaderTimeout: 3 * time.Second`, `ReadTimeout: 5 * time.Second`, `WriteTimeout: 10 * time.Second`, `IdleTimeout: 120 * time.Second`, and `MaxHeaderBytes: 1 << 20` (1 MB) to mitigate Slowloris and resource exhaustion attacks.

8. **Client Input & Attribute Sanitization**:
   - Theme values stored in `localStorage` MUST be strictly validated against the allowlist `['dark', 'light']` before applying to DOM attributes in `theme-init.js` and `app.js`.
   - All `localStorage` operations MUST remain wrapped in `try...catch` via `safeStorage`.
