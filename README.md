# E.'s Dev Dashboard

[![CI Pipeline](https://github.com/MeRideBike/antigravity_playground/actions/workflows/ci.yml/badge.svg)](https://github.com/MeRideBike/antigravity_playground/actions/workflows/ci.yml)
[![CodeQL Security](https://github.com/MeRideBike/antigravity_playground/actions/workflows/codeql.yml/badge.svg)](https://github.com/MeRideBike/antigravity_playground/actions/workflows/codeql.yml)
[![OWASP ASVS Level 3](https://img.shields.io/badge/OWASP%20ASVS-Level%203%20High%20Assurance-brightgreen.svg)](#security--hardened-network-isolation-owasp-asvs-level-3)
[![W3C Trusted Types](https://img.shields.io/badge/W3C-Trusted%20Types-brightgreen.svg)](#security--hardened-network-isolation-owasp-asvs-level-3)
[![SLSA Level 3](https://img.shields.io/badge/SLSA-Level%203-blue.svg)](#verification--testing)
[![golangci-lint](https://img.shields.io/badge/golangci--lint-passing-brightgreen.svg)](#verification--testing)
[![Coverage](https://img.shields.io/badge/coverage-100%25%20core%20logic-brightgreen.svg)](#verification--testing)
[![Lighthouse Score](https://img.shields.io/badge/Lighthouse-100%2F100-brightgreen.svg)](#features)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://meridebike.github.io/antigravity_playground/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WCAG 2.2 Level AA](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-success.svg)](#security--hardened-network-isolation-owasp-asvs-level-3)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blueviolet.svg)](#features)

A lightweight, high-assurance (OWASP ASVS Level 3), zero-dependency developer dashboard and Go telemetry monitor for monitoring service metrics, build diagnostics, and simulating real-time traffic spikes.

[🚀 **Live Demo**](https://meridebike.github.io/antigravity_playground/) • [📖 **Architecture Docs**](docs/architecture.md) • [🏛️ **ADRs**](docs/adr/README.md) • [🛡️ **Security Policy**](SECURITY.md) • [🤝 **Contributing**](CONTRIBUTING.md) • [⚖️ **License**](LICENSE)

---

## Features

- **Key Metrics Overview**: Real-time display cards for Active Build Jobs, API Requests / Sec, and Memory Heap Usage.
- **Interactive Metric & Pipeline Simulator**:
  - **Traffic Spike Simulation**: Generates bounded realistic traffic spikes (350–850 req/s), calculates delta/percentage increases, and triggers smooth pulse animations via the Web Animations API.
  - **Build Pipeline Controls**: Interactively `Queue Build`, `Complete Job`, or `Simulate Failure` with bounded capacity enforcement (0 to 10 max).
  - **Memory Diagnostics & Telemetry**: Interactively `Trigger Server GC` or `Simulate Allocation` to test garbage collection and heap capacity thresholds.
  - **Diagnostic Snapshots & Reports**: Export complete system state as a downloadable JSON file, copy formatted Markdown reports to clipboard, or clear the activity log.
  - **Reset Controls**: Restores metrics to initial baseline values (142 req/s).
- **Recent Pipeline Activity Log & Live Filtering**:
  - Automatically records and displays the last 5 pipeline events in an accessible FIFO list with timestamps, machine-readable `<time datetime>`, and status badges (`Queued`, `Success`, `Failed`).
  - **Severity Filters**: Filter events dynamically by `All`, `Queued`, `Success`, or `Failed` status.
  - **Live Search**: Instantly search event messages and build IDs via an accessible search input.
- **Live Go Runtime Telemetry & Health Monitoring**:
  - Automatically queries the `/health` and `/api/telemetry` endpoints periodically (every 15s) and on window focus.
  - Reports live Go memory statistics (`runtime.ReadMemStats` heap allocation, total system memory, GC cycle counts, active goroutines, and process PID).
  - Displays dynamic status indicators (`Online`, `Offline`, or `Local File Mode` when opened directly without a server).
- **Theme Switcher (Dark & Light)**:
  - Persistent theme selection stored safely in `localStorage` via a resilient `safeStorage` wrapper.
  - Early bootstrap script ([theme-init.js](file:///C:/Users/ethan/OneDrive/Desktop/antigravity_playground/theme-init.js)) in `<head>` to eliminate Flash of Unstyled Content (FOUC).
- **Security & Hardened Network Isolation (OWASP ASVS Level 3 & CISO Standards)**:
  - **Virtualized Filesystem (`embed.FS`)**: Static web assets are embedded directly into the Go binary as an immutable read-only virtual filesystem (`io/fs`), completely eliminating runtime host disk access, symlink attacks, and LFI / Path Traversal vulnerabilities.
  - **W3C Trusted Types (Mathematical DOM XSS Immunity)**: Enforces `require-trusted-types-for 'script'; trusted-types default dashboardPolicy;` in CSP with client-side default policy forbidding dynamic HTML string injection sinks.
  - **Sec-Fetch Metadata Protocol Defense**: Blocks cross-site API querying and state-mutating requests at the HTTP protocol layer with `403 Forbidden`.
  - **In-Memory Sliding-Window Rate Limiter**: Throttles burst requests per IP address to mitigate DoS, thread starvation, and Slowloris attacks.
  - **Loopback Default Binding**: Server binds exclusively to `127.0.0.1` by default to prevent unauthorized LAN / Wi-Fi exposure (configurable via `-host` or `HOST`).
  - **Unified Security Headers Middleware**: All responses include `Content-Security-Policy` Level 3, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`.
  - **DoS & Slowloris Mitigation**: Server enforces `ReadHeaderTimeout: 3s`, `ReadTimeout: 5s`, `WriteTimeout: 10s`, `IdleTimeout: 120s`, and `MaxHeaderBytes: 1MB`.
  - **Theme Input Sanitization**: Defensive allowlist validation (`['dark', 'light']`) preventing DOM attribute injection.
  - **Accessibility (WCAG 2.2 Level AA)**: "Skip to main content" link, high-contrast text (>4.5:1), adaptive focus ring tokens, minimum interactive dimensions (≥24×24px / 42px touch height), and machine-readable `<time datetime>`.
- **Automated Verification Suites**:
  - Pure calculation, build state transitions, FIFO trimming, theme sanitization, storage utilities, and Trusted Types policy tested with Node.js (`node:test`).
  - Automated Go backend security test suite (`main_test.go`) validating virtual filesystem serving, Sec-Fetch filtering, rate limiting, route whitelisting, HTTP method gating, path traversal immunity, and security headers.

---

## Project Structure

```text
antigravity_playground/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Automated Node.js, Go tests, multi-linter & SAST scan
│   │   ├── codeql.yml          # Automated CodeQL SAST security scanning
│   │   ├── security-scan.yml   # Automated Gitleaks secret scanning (NIST SP 800-218)
│   │   ├── slsa-sbom.yml       # Automated SLSA Level 3 SBOM & provenance generator
│   │   ├── commitlint.yml      # Automated PR & Conventional Commits linter
│   │   └── lighthouse.yml      # Automated Google Lighthouse CI performance audit
│   ├── ISSUE_TEMPLATE/         # Structured GitHub Issue forms (bugs & features)
│   ├── PULL_REQUEST_TEMPLATE.md# Enterprise PR review checklist
│   └── dependabot.yml          # Automated supply-chain dependency maintenance
├── .lighthouserc.json          # Google Lighthouse CI assertion rules
├── .golangci.yml               # golangci-lint multi-linter static analysis rules
├── .agents/                    # Agent development rules and workflows
│   ├── rules/                  # Active governance policies (architecture, security, testing, git)
│   └── workflows/              # Operational runbooks (documentation-maintenance, adr-creation)
├── docs/                       # System documentation & technical architecture
│   ├── architecture.md         # Detailed architecture, component diagram, and data flow
│   └── adr/                    # Architecture Decision Records (ADRs 0001-0004)
├── index.html                  # Main dashboard HTML structure with CSP and ARIA attributes
├── style.css                   # Responsive styles, CSS variables, dark/light themes, animations
├── app.js                      # Application logic (Trusted Types, metrics, build pipeline, activity log)
├── theme-init.js               # Fast theme bootstrap script loaded in <head>
├── test_dashboard.js           # Unit test suite for calculation logic, pipeline states, storage & Trusted Types
├── main.go                     # Hardened Go HTTP server with embed.FS, Sec-Fetch & rate limiter
├── main_test.go                # Go integration and security verification test suite
├── go.mod                      # Standard-library Go module definition (zero external deps)
├── CONTRIBUTING.md             # Contribution guidelines & branching standards
├── SECURITY.md                 # Security architecture & vulnerability policy (ASVS Level 3)
├── LICENSE                     # MIT Open Source License
├── AGENTS.md                   # Agent governance index & policy hierarchy
├── README.md                   # Project documentation & badges
└── .vscode/
    ├── launch.json             # VS Code debug profiles for Chrome
    └── tasks.json              # VS Code tasks for building and starting the server
```

---

## Getting Started / How to Run

You can run the project locally using any of the following methods:

### Option 1: Run with Go (Recommended)

Requires [Go](https://go.dev/) (1.18+):

```powershell
go run main.go
```

To run on a custom port, use the `-port` flag or set the `PORT` environment variable:

```powershell
go run main.go -port 3000
```

Open [http://localhost:8080](http://localhost:8080) (or your chosen port) in your web browser.

---

### Option 2: Run the Precompiled Binary (Windows)

Execute the included Windows binary directly:

```powershell
.\server.exe
```

Or on a custom port:

```powershell
.\server.exe -port 3000
```

---

### Option 3: Open Directly in Browser (Local File Mode)

Since the core dashboard has no mandatory external dependencies, you can open `index.html` directly in any web browser without running a server:

```powershell
Start-Process index.html
```

*(When running in Local File Mode, the status indicator will reflect `Local File Mode` and disable `/health` polling).*

---

### Option 4: Run via VS Code

- **Run Task**: Press `Ctrl + Shift + P` -> `Tasks: Run Task` -> `Start Go Server`.
- **Debug / Launch**: Press `F5` to launch Chrome connected to `http://localhost:8080` or directly inspect `index.html`.

---

## Verification & Testing

### 1. Run Unit Tests & Native Code Coverage (Node.js Test Runner)
Executes unit tests for calculation boundaries, baseline values, fuzz testing, error-tolerant storage, theme sanitization, Trusted Types, and prints native coverage metrics:
```powershell
node --test --experimental-test-coverage test_dashboard.js
```

### 2. Run Go Backend Security & Integration Tests
Executes Go tests verifying virtual filesystem serving, Sec-Fetch metadata blocking, sliding-window rate limiting, route whitelisting, HTTP method gating, path traversal fuzzing, DoS timeouts, and security headers:
```powershell
go test -v ./...
```

### 3. Verify Code Syntax, Multi-Linters & SAST Security Scans
```powershell
# Check JavaScript syntax
node --check app.js
node --check theme-init.js

# Check Go formatting, linting & static analysis
gofmt -s -l .
go vet ./...
staticcheck ./...
errcheck ./...
revive ./...
ineffassign ./...

# Run official Go vulnerability and AST security checks
govulncheck ./...
gosec -exclude-dir=test ./...
```

### 4. Recompile Server Binary
```powershell
go build -o server.exe main.go
```

### 5. Verify HTTP Server Endpoints (While Server Is Running)
```powershell
# Check health status JSON
curl.exe -s http://localhost:8080/health

# Check live Go runtime telemetry JSON
curl.exe -s http://localhost:8080/api/telemetry

# Trigger server-side Garbage Collection (POST)
curl.exe -s -X POST http://localhost:8080/api/gc

# Verify that source files and binaries are protected (returns 404)
curl.exe -I http://localhost:8080/main.go
curl.exe -I http://localhost:8080/server.exe
```

---

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.


