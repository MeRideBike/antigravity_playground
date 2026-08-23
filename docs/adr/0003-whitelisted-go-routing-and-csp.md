# ADR 0003: Hardened Whitelisted Go HTTP Routing & Strict CSP

## Status
Accepted

## Context
Standard local file servers (such as `http.FileServer(http.Dir("."))`) inadvertently expose repository internals to anyone accessing the HTTP port, including source code files (`main.go`, `app.js` tests), binaries (`server.exe`), environment configs, and hidden directories (`.git`, `.vscode`, `.agents`).

Additionally, permissive web frontends are susceptible to Cross-Site Scripting (XSS) and clickjacking attacks if Content Security Policy (CSP) and MIME-type sniffing headers are not enforced.

## Decision
1. **Explicit Route Whitelisting**:
   - `main.go` registers explicit routes for permitted public assets (`/index.html`, `/style.css`, `/app.js`, `/theme-init.js`) and dynamic APIs (`/health`, `/api/telemetry`, `/api/gc`).
   - Any unlisted path (including attempts to download `main.go`, `server.exe`, or hidden directories) immediately returns `404 Not Found`.

2. **Strict Security Headers**:
   - Every response includes `X-Content-Type-Options: nosniff`.
   - `index.html` includes a restrictive Content Security Policy (`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;`) prohibiting `'unsafe-inline'` and `'unsafe-eval'`.

## Consequences

### Positive
- **Defense in Depth**: Prevents information disclosure and arbitrary local file downloads.
- **XSS Mitigation**: Disallows inline script execution or external asset injection.

### Negative / Trade-offs
- Adding a new static web asset requires registering the route in `main.go`'s whitelist table.
