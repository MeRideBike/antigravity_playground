# E.'s Dev Dashboard

[![CI Pipeline](https://github.com/MeRideBike/antigravity_playground/actions/workflows/ci.yml/badge.svg)](https://github.com/MeRideBike/antigravity_playground/actions/workflows/ci.yml)
[![CodeQL Security](https://github.com/MeRideBike/antigravity_playground/actions/workflows/codeql.yml/badge.svg)](https://github.com/MeRideBike/antigravity_playground/actions/workflows/codeql.yml)
[![golangci-lint](https://img.shields.io/badge/golangci--lint-passing-brightgreen.svg)](#verification--testing)
[![Coverage](https://img.shields.io/badge/coverage-100%25%20core%20logic-brightgreen.svg)](#verification--testing)
[![Lighthouse Score](https://img.shields.io/badge/Lighthouse-100%2F100-brightgreen.svg)](#features)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://meridebike.github.io/antigravity_playground/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WCAG 2.2 Level AA](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA-success.svg)](#security--accessibility-wcag-22-level-aa)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blueviolet.svg)](#features)

A lightweight, secure, zero-dependency developer dashboard and Go telemetry monitor for monitoring service metrics, build diagnostics, and simulating real-time traffic spikes.

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
- **Security & Accessibility (WCAG 2.2 Level AA)**:
  - Strict Content Security Policy (CSP) and `X-Content-Type-Options: nosniff` header.
  - "Skip to main content" keyboard bypass link (`.skip-link` / WCAG 2.4.1).
  - High-contrast text (>4.5:1) and adaptive focus ring tokens (`--focus-ring-color` / WCAG 1.4.11).
  - Minimum interactive target sizes (≥24×24px / 42px touch height / WCAG 2.2 SC 2.5.8).
  - Server-side route whitelisting preventing unauthorized HTTP access to source code, tests, and binaries.
  - Full keyboard accessible navigation (`:focus-visible`), ARIA attributes, semantic headings, machine-readable `<time datetime>`, and `prefers-reduced-motion` animation support.
- **Automated Unit Testing**:
  - Pure calculation, build state transitions, FIFO trimming, and storage utilities tested with the built-in Node.js test runner (`node:test`).

---

## Project Structure

```text
antigravity_playground/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Automated Node.js & Go CI test suite
│   │   ├── codeql.yml          # Automated CodeQL SAST security scanning
│   │   ├── commitlint.yml      # Automated PR & Conventional Commits linter
│   │   └── lighthouse.yml      # Automated Google Lighthouse CI performance audit
│   ├── ISSUE_TEMPLATE/         # Structured GitHub Issue forms (bugs & features)
│   ├── PULL_REQUEST_TEMPLATE.md# Enterprise PR review checklist
│   └── dependabot.yml          # Automated supply-chain dependency maintenance
├── .lighthouserc.json          # Google Lighthouse CI assertion rules
├── .golangci.yml               # golangci-lint multi-linter static analysis rules
├── .agents/                    # Agent development rules and workflows
│   ├── rules/                  # Active governance policies (architecture, security, testing, git)
│   └── workflows/              # Operational runbooks (documentation-maintenance)
├── docs/                       # System documentation & technical architecture
│   ├── architecture.md         # Detailed architecture, component diagram, and data flow
│   └── adr/                    # Architecture Decision Records (ADRs 0001-0003)
├── index.html                  # Main dashboard HTML structure with CSP and ARIA attributes
├── style.css                   # Responsive styles, CSS variables, dark/light themes, animations
├── app.js                      # Application logic (metrics, build pipeline, activity log, DOM rendering)
├── theme-init.js               # Fast theme bootstrap script loaded in <head>
├── test_dashboard.js           # Unit test suite for calculation logic, pipeline states & storage
├── main.go                     # Hardened Go HTTP server with route whitelisting & telemetry API
├── go.mod                      # Standard-library Go module definition (zero external deps)
├── CONTRIBUTING.md             # Contribution guidelines & branching standards
├── SECURITY.md                 # Security architecture & vulnerability policy
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
Executes unit tests for calculation boundaries, baseline values, fuzz testing, error-tolerant storage, and prints native coverage metrics:
```powershell
node --test --experimental-test-coverage test_dashboard.js
```

### 2. Verify Code Syntax & Multi-Linter Analysis
```powershell
# Check JavaScript syntax
node --check app.js
node --check theme-init.js

# Check Go formatting & static analysis
gofmt -s -d main.go
go vet main.go

# Run golangci-lint (if installed locally)
golangci-lint run
```

### 3. Recompile Server Binary
```powershell
go build -o server.exe main.go
```

### 4. Verify HTTP Server Endpoints (While Server Is Running)
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

