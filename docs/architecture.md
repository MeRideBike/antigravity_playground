# Technical Architecture & System Design

This document details the architectural layout, security model, and data flow of **E.'s Dev Dashboard**.

---

## 1. System Components

```
+-------------------------------------------------------------------------+
|                                Browser                                  |
|                                                                         |
|  [index.html] -- (loads) -> [theme-init.js] (Pre-render Theme Setup)    |
|       |                                                                 |
|       +-----------> [style.css]     (Tokens, Dark/Light, WCAG AA, A11y) |
|       |                                                                 |
|       +-----------> [app.js]        (Trusted Types, MetricCalculator)   |
|                          |                                              |
|                          v (Polling /health & /api/telemetry every 15s) |
+--------------------------|----------------------------------------------+
                           |
                           v HTTP (Port 8080 or -port)
+-------------------------------------------------------------------------+
|                            Go HTTP Server                               |
|                                                                         |
|  [main.go / server.exe]                                                 |
|    ├── Security Middleware Pipeline:                                    |
|    │   ├── Path Sanitization & Traversal Mitigation                     |
|    │   ├── Sec-Fetch Metadata Inspection (Blocks Cross-Site APIs)       |
|    │   ├── Sliding-Window Token Bucket Rate Limiter (IP Throttling)     |
|    │   └── Security Headers (CSP Level 3 Trusted Types, nosniff, DENY) |
|    ├── Virtualized Asset Filesystem (embed.FS / io/fs):                 |
|    │   └── /, /index.html, /style.css, /app.js, /theme-init.js          |
|    │       (Zero Host Disk I/O, Immutable In-Memory Storage)            |
|    ├── Health API: /health -> {"status": "online", "uptime": "..."}     |
|    ├── Telemetry API: /api/telemetry -> {allocMB, sysMB, numGC, ...}    |
|    ├── GC API: /api/gc (POST) -> triggers runtime.GC()                  |
|    └── Host Disk Isolation: Source code & host binaries not exposed     |
+-------------------------------------------------------------------------+
```

---

## 2. Key Modules

### Frontend (`/`)
- **`index.html`**: Root document configured with strict Content Security Policy with Trusted Types (`require-trusted-types-for 'script'; trusted-types default dashboardPolicy;`), a "Skip to main content" bypass link (WCAG 2.4.1), accessible landmark headings (`<h3>`), atomic live regions (`aria-live="polite"`), interactive controls for traffic, build pipelines, and memory diagnostics, and a dedicated Recent Pipeline Activity log section with live search and severity filter controls.
- **`theme-init.js`**: Synchronous pre-render script to read saved theme from `localStorage` without triggering FOUC, while avoiding inline script CSP violations.
- **`style.css`**: CSS variables for theming, responsive grid layouts, WCAG 2.2 Level AA calibrated color tokens (>4.5:1 text contrast and >3:1 non-text focus ring contrast in both dark and light modes), minimum target dimensions (≥24×24px / 42px touch height), explicit `:focus-visible` outlines, and `@media (prefers-reduced-motion: reduce)` support.
- **`app.js`**: Contains:
  - `initTrustedTypes`: Configures W3C Trusted Types `default` policy that forbids dynamic HTML string sinks at the browser engine level.
  - `MetricCalculator`: Pure mathematical logic for baseline metrics, bounded traffic spike calculation `[350, 850]`, build queue management (bounded 0 to 10), telemetry parsing, byte formatting, diagnostic snapshot generation (`generateDiagnosticSnapshot`), Markdown report formatting (`formatMarkdownReport`), multi-criteria event filtering (`filterActivityLog`), activity log FIFO formatting, SVG sparkline coordinate mapping (`generateSparklinePath`), probe uptime/latency calculation (`calculateProbeStats`), metric threshold limits (`evaluateThresholds`), command palette search (`filterCommands`), section reordering (`reorderSections`), and 4-stage pipeline execution metadata (`generateBuildStages`).
  - `safeStorage`: Exception-safe wrapper around `localStorage` for theme, density, probe configurations, and layout order.
  - `checkServerHealth`: Dynamic health & telemetry polling that synchronizes real-time Go process memory and toggles between `Server: Online`, `Server: Offline`, and `Local File Mode`.
  - `pollProbes`: Polls local loopback services (`/api/probe?target=...`) and computes rolling latency and uptime stats.
  - `Command Palette`: Global keyboard engine (`Ctrl+K`, `Cmd+K`, `/`) providing fuzzy command search, action execution, and accessibility navigation.
  - `View Density`: Adaptive display modes (`Compact` for IDE split-screen view vs. `Comfortable`).
  - `Section Drag-and-Drop`: Native HTML5 drag-and-drop widget arrangement with persistent ordering.
  - `Pipeline Step Inspector`: Semantic `<dialog>` modal rendering structured diagnostics across Lint, Test, SAST Gate, and Compilation stages.
  - `triggerCardPulse`: Zero-reflow animation via the Web Animations API.
  - `renderActivityList`: Accessible, injection-safe DOM builder for pipeline events with dynamic result count updates and standard `<time datetime="...">` metadata.

### Backend (`main.go` / `server.exe`)
- **Virtualized Filesystem (`embed.FS`)**: Static web assets (`index.html`, `style.css`, `app.js`, `theme-init.js`) are compiled directly into the binary, completely eliminating runtime disk access, symlink traversal, and LFI.
- **Sec-Fetch Metadata Validation**: Protocol-level defense blocking cross-site API probing and unauthorized mutations with `403 Forbidden`.
- **In-Memory Sliding-Window Rate Limiter**: Thread-safe IP rate limiting (100 req/min) mitigating DoS, thread exhaustion, and Slowloris attacks.
- Standard-library Go server with loopback network isolation (`127.0.0.1` default, configurable via `-host` or `HOST`).
- Unified security headers middleware enforcing strict CSP Level 3 (`require-trusted-types-for 'script'`, `trusted-types default dashboardPolicy`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and Cross-Origin Isolation headers (COOP/CORP).
- Path traversal rejection middleware blocking encoded and unencoded directory traversal payloads (`..`, `%2e%2e`, `%00`).
- DoS & Slowloris hardening via `ReadHeaderTimeout: 3s`, `ReadTimeout: 5s`, `WriteTimeout: 10s`, `IdleTimeout: 120s`, and `MaxHeaderBytes: 1MB`.
- Authorized endpoints for `/health`, `/api/telemetry`, `POST /api/gc`, and `GET /api/probe?target=...` (strictly validated against loopback addresses with SSRF protection).
- Automatic caching headers with `304 Not Modified` conditional validation via `http.ServeContent`.

### Test Suites
- **Frontend & Calculator Tests (`test_dashboard.js`)**:
  - Automated tests running directly with `node --test`.
  - Covers baseline state validation, boundary assertions, fuzz testing (100 iterations), build pipeline state transitions, formatBytes conversions, telemetry JSON parsing, memory simulation, diagnostic snapshot schema validation, markdown report generation, severity and text search log filtering, theme allowlist sanitization against DOM injection, FIFO trimming (5 items max), storage fallback behavior, W3C Trusted Types policy validation, SVG sparkline path mathematics, multi-service probe statistics, metric threshold evaluations, command palette search filtering, layout section reordering, and 4-stage pipeline stepper generation.
- **Backend Security & Routing Tests (`main_test.go`)**:
  - Automated tests running with `go test ./...`.
  - Asserts 200 OK on virtual embedded assets and API routes.
  - Asserts 404 Not Found on unlisted paths and source code files.
  - Asserts 405 Method Not Allowed on disallowed HTTP verbs (`POST`, `PUT`, `DELETE`, `PATCH`).
  - Asserts 403 Forbidden on cross-site `Sec-Fetch` requests.
  - Asserts 429 Too Many Requests on rate limiter threshold exhaustion.
  - Asserts 400 Bad Request and SSRF prevention on unauthorized probe targets (`google.com`, `192.168.1.1`, `169.254.169.254`).
  - Fuzzes path traversal payloads (`/..%2f`, `/%2e%2e/`, `//`, `%00`).
  - Validates delivery of all security headers, Trusted Types directives, and JSON telemetry contracts.

---

## 3. CI/CD & Security Automation

- **Automated Continuous Integration (`.github/workflows/ci.yml`)**:
  - Runs on all pushes and pull requests across `develop`, `test`, `production`, and feature branches.
  - Verifies JavaScript syntax (`node --check`), executes unit tests with native coverage (`node --test --experimental-test-coverage`), runs Go static analysis (`go vet`, `staticcheck`, `revive`, `errcheck`, `ineffassign`), executes Go security tests (`go test -v ./...`), runs vulnerability checks (`govulncheck`, `gosec`), and verifies binary builds (`go build`).
- **Static Application Security Testing (`.github/workflows/codeql.yml`)**:
  - Automatically executes GitHub CodeQL SAST scanning for Go and JavaScript to detect security vulnerabilities and injection risks.
- **Secret Leak Detection (`.github/workflows/security-scan.yml`)**:
  - Scans repository commits and pull requests with `gitleaks` to enforce NIST SP 800-218 credential leak prevention.
- **Supply Chain Integrity & SBOM Generation (`.github/workflows/slsa-sbom.yml`)**:
  - Generates SPDX Software Bill of Materials (SBOM) and build provenance for releases adhering to SLSA Level 3 standards.
- **Automated Google Lighthouse CI (`.github/workflows/lighthouse.yml`)**:
  - Executes automated web audits to enforce 100% scores across Performance, Accessibility, Best Practices, and SEO based on `.lighthouserc.json`.
- **Automated PR & Commit Linter (`.github/workflows/commitlint.yml`)**:
  - Validates that pull request titles strictly follow Conventional Commits formatting.
- **Continuous Deployment**:
  - Automated deployment of the `production` branch to GitHub Pages CDN at `https://meridebike.github.io/antigravity_playground/`.

---

## 4. Architecture Decision Records (ADRs)

Key architectural choices and trade-offs are formally tracked in [`docs/adr/`](adr/README.md):
- [**ADR 0001**](adr/0001-zero-runtime-framework-dependencies.md): Zero Runtime Framework Dependencies
- [**ADR 0002**](adr/0002-early-theme-bootstrap-strategy.md): Early Theme Bootstrap Strategy to Prevent FOUC
- [**ADR 0003**](adr/0003-whitelisted-go-routing-and-csp.md): Hardened Whitelisted Go HTTP Routing & Strict CSP
- [**ADR 0004**](adr/0004-owasp-asvs-level-3-and-advanced-standards.md): OWASP ASVS Level 3, embed.FS Virtualization, Trusted Types & Advanced Security Standards
- [**ADR 0005**](adr/0005-observability-sparklines-and-service-probes.md): Real-Time SVG Sparklines, Multi-Service Probes, Command Palette, and Ergonomic UX Architecture



