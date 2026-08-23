# Rule: Security Policies

**Status**: Always On  
**Scope**: Server routing, HTML headers, storage operations

---

## Mandatory Security Standards

1. **Content Security Policy (CSP)**:
   - `index.html` MUST maintain a strict CSP:
     ```html
     <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;">
     ```
   - Do NOT re-introduce `'unsafe-inline'` or `'unsafe-eval'`. All scripts must be loaded from discrete, same-origin `.js` files.

2. **Backend Route Whitelisting**:
   - `main.go` MUST only serve explicitly whitelisted static web assets (`/index.html`, `/style.css`, `/app.js`, `/theme-init.js`) and the `/health` API.
   - Non-whitelisted routes (including source files `main.go`, `server.exe`, `test_dashboard.js`, `README.md`, hidden directories) MUST return `404 Not Found`.
   - Non-GET/HEAD HTTP methods on static assets MUST return `405 Method Not Allowed`.

3. **Defensive Client Storage**:
   - All `localStorage` operations in `app.js` and `theme-init.js` MUST be wrapped in `try...catch` via `safeStorage` to ensure uninterrupted execution in sandboxed iframes or private browsing contexts.
