# Security Policy

## Supported Versions

| Version | Supported          |
| :--- | :--- |
| `production` | :white_check_mark: |
| `develop` | :white_check_mark: |

---

## Security Architecture & Defenses

**E.'s Dev Dashboard** implements defense-in-depth security principles:

1. **Content Security Policy (CSP)**:
   - `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;`
   - Prohibits inline scripts (`'unsafe-inline'`) and dynamic code evaluation (`'unsafe-eval'`).
2. **HTTP Route Whitelisting**:
   - The Go HTTP server (`main.go`) only serves explicitly registered static assets (`/index.html`, `/style.css`, `/app.js`, `/theme-init.js`) and API endpoints.
   - All unlisted paths return `404 Not Found`, preventing unauthorized file downloads of source code (`main.go`), binaries (`server.exe`), or hidden configuration files.
3. **MIME-Type & Frame Protection**:
   - Enforces `X-Content-Type-Options: nosniff` across all responses.
4. **Automated SAST Scanning**:
   - Integrated with GitHub CodeQL to perform continuous static security analysis on all Go and JavaScript files.

---

## Reporting a Vulnerability

If you discover a security vulnerability, please do not open a public issue. Instead, report it privately through GitHub Security Advisories or by contacting the maintainer via GitHub.
