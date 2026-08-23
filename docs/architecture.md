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
|       +-----------> [app.js]        (MetricCalculator, State, Render)   |
|                          |                                              |
|                          v (Polling /health & /api/telemetry every 15s) |
+--------------------------|----------------------------------------------+
                           |
                           v HTTP (Port 8080 or -port)
+-------------------------------------------------------------------------+
|                            Go HTTP Server                               |
|                                                                         |
|  [main.go / server.exe]                                                 |
|    ├── Whitelisted Static Assets: /, /index.html, /style.css,           |
|    │                              /app.js, /theme-init.js               |
|    │   └── Caching: Cache-Control & 304 via http.ServeContent           |
|    ├── Health API: /health -> {"status": "online", "uptime": "..."}     |
|    ├── Telemetry API: /api/telemetry -> {allocMB, sysMB, numGC, ...}    |
|    ├── GC API: /api/gc (POST) -> triggers runtime.GC()                  |
|    └── Protected / Blocked: 404 on main.go, server.exe, tests, docs     |
+-------------------------------------------------------------------------+
```

---

## 2. Key Modules

### Frontend (`/`)
- **`index.html`**: Root document configured with strict Content Security Policy (`script-src 'self'`), a "Skip to main content" bypass link (WCAG 2.4.1), accessible landmark headings (`<h3>`), atomic live regions (`aria-live="polite"`), interactive controls for traffic, build pipelines, and memory diagnostics, and a dedicated Recent Pipeline Activity log section with live search and severity filter controls.
- **`theme-init.js`**: Synchronous pre-render script to read saved theme from `localStorage` without triggering FOUC, while avoiding inline script CSP violations.
- **`style.css`**: CSS variables for theming, responsive grid layouts, WCAG 2.2 Level AA calibrated color tokens (>4.5:1 text contrast and >3:1 non-text focus ring contrast in both dark and light modes), minimum target dimensions (≥24×24px / 42px touch height), explicit `:focus-visible` outlines, and `@media (prefers-reduced-motion: reduce)` support.
- **`app.js`**: Contains:
  - `MetricCalculator`: Pure mathematical logic for baseline metrics, bounded traffic spike calculation `[350, 850]`, build queue management (bounded 0 to 10), telemetry parsing, byte formatting, diagnostic snapshot generation (`generateDiagnosticSnapshot`), Markdown report formatting (`formatMarkdownReport`), multi-criteria event filtering (`filterActivityLog`), and activity log FIFO formatting.
  - `safeStorage`: Exception-safe wrapper around `localStorage`.
  - `checkServerHealth`: Dynamic health & telemetry polling that synchronizes real-time Go process memory and toggles between `Server: Online`, `Server: Offline`, and `Local File Mode`.
  - `triggerCardPulse`: Zero-reflow animation via the Web Animations API.
  - `renderActivityList`: Accessible, injection-safe DOM builder for pipeline events with dynamic result count updates and standard `<time datetime="...">` metadata.

### Backend (`main.go` / `server.exe`)
- Standard-library Go server with strict route whitelisting.
- Authorized endpoints for `/health`, `/api/telemetry`, and `/api/gc`.
- Automatic caching headers with `304 Not Modified` conditional validation via `http.ServeContent`.
- Configurable listening port via `-port` flag and `PORT` environment variable.

### Test Suite (`test_dashboard.js`)
- Automated tests running directly with `node --test`.
- Covers baseline state validation, boundary assertions, fuzz testing (100 iterations), build pipeline state transitions, formatBytes conversions, telemetry JSON parsing, memory simulation, diagnostic snapshot schema validation, markdown report generation, severity and text search log filtering, FIFO trimming (5 items max), and storage fallback behavior.
