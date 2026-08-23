# ADR 0005: Real-Time SVG Sparklines, Multi-Service Probes, Command Palette, and Ergonomic UX Architecture

## Status
Accepted

## Context
As **E.'s Dev Dashboard** matures as a high-assurance local developer dashboard, engineers require deeper real-time observability and ergonomic control over their local microservices and development workflows without introducing external runtime libraries or violating OWASP ASVS Level 3 security:
1. **Real-Time Telemetry Trends**: Visualizing traffic bursts, memory pressure, and build queues requires rolling visual trends rather than static instantaneous counters.
2. **Local Multi-Service Health Monitoring**: Local full-stack workflows involve multiple microservices (e.g. Go server on `:8080`, Vite/React on `:3000`, Python/Flask on `:5000`). Developers need a centralized probe hub with latency and uptime metrics, while strictly guarding against Server-Side Request Forgery (SSRF) vulnerabilities.
3. **Pipeline Diagnostics Transparency**: When build jobs succeed or fail, developers need granular visibility into each stage of the pipeline (`Syntax & Lint` -> `Unit Tests` -> `ASVS SAST Gate` -> `Binary Build`).
4. **Keyboard-Driven Workflow**: High-velocity developer ergonomics require instant modal navigation and command execution via a global Command Palette (`Ctrl+K` / `Cmd+K`).
5. **Workspace Density & Layout Adaptability**: Developers working on ultra-wide monitors or 50/50 split-screen IDE layouts need adaptable information density (`Comfortable` vs `Compact`) and persistent widget layout arrangement.

## Decision
1. **Zero-Dependency SVG Sparkline Engine**:
   - Pure mathematical path generation implemented in `MetricCalculator.generateSparklinePath(points, width, height)`.
   - Normalizes rolling time-series arrays into SVG coordinate strings (`M x0,y0 L x1,y1 ...`) for smooth line strokes and translucent gradient area fills.
   - Built with defensive handling for single points, uniform values, and empty data without layout reflows or external charting packages (e.g. Chart.js).
2. **SSRF-Safe Multi-Service Probe Hub**:
   - Added `GET /api/probe?target=...` endpoint to Go backend with strict loopback validation (`127.0.0.1`, `localhost`, `::1`).
   - All WAN IPs, private LAN ranges, cloud metadata endpoints (`169.254.169.254`), and non-loopback redirects are rejected with `400 Bad Request`.
   - Reconstructs safe URLs from parsed components and enforces timeouts (2s) to prevent resource starvation.
   - Client manages probe registration with HTML5 pattern validation and persists configurations in `safeStorage`.
3. **Interactive 4-Stage Pipeline Step Inspector**:
   - Clicking any activity log entry opens a semantic `<dialog>` modal rendering structured diagnostics for all 4 verification gates.
   - Computes execution timings, status badges, and CLI command logs per stage.
4. **Global Quick-Action Command Palette (`Ctrl+K` / `Cmd+K`)**:
   - Accessible `<dialog>` modal with ARIA `combobox` / `listbox` pattern.
   - Instant fuzzy search across system actions, view density toggles, probe management, and diagnostic report exports.
   - Full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`, `/`).
5. **View Density Engine & Layout Reordering**:
   - `[data-density="compact"]` CSS token overrides for high-density IDE split-screen environments.
   - Native HTML5 Drag and Drop section arrangement persisted to `safeStorage` for instant layout restoration across sessions.

## Consequences

### Positive
- **Complete Visual Observability**: Instant identification of telemetry spikes and memory growth patterns.
- **Microservice Centralization**: Single-pane-of-glass status for all active local development servers without browser context switching.
- **SSRF Immunity**: Strict hostname allowlist and redirect validation prevents SSRF attacks.
- **Zero Runtime Dependencies Preserved**: All features implemented using standard web standards (HTML5/CSS3/ES2022) and Go standard library.
- **Full W3C Trusted Types & CSP Compliance**: All UI mutations utilize safe DOM APIs (`createElement`, `textContent`, `setAttribute`), avoiding dynamic HTML string sinks.

### Negative / Trade-offs
- Local File Mode (`file:///`) does not have access to Go network sockets and uses client-side simulated latencies for probes unless connected to the Go HTTP server.
