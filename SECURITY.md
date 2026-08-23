# Security Policy

## Supported Versions

| Version | Supported          |
| :--- | :--- |
| `production` | :white_check_mark: |
| `develop` | :white_check_mark: |

---

## Security Architecture & High-Assurance Defenses (OWASP ASVS Level 3)

**E.'s Dev Dashboard** implements defense-in-depth security principles adhering to **OWASP ASVS Level 3**, **W3C Trusted Types**, and **SLSA Level 3**:

1. **Virtualized Filesystem (`embed.FS`)**:
   - All static assets (`index.html`, `style.css`, `app.js`, `theme-init.js`) are compiled directly into the binary as an immutable read-only virtual filesystem (`io/fs`).
   - Completely eliminates runtime disk reads, symlink attacks, and Local File Inclusion (LFI) / Path Traversal vulnerabilities.
2. **W3C Trusted Types & CSP Level 3**:
   - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default dashboardPolicy;`
   - Client-side `default` policy rejects dynamic HTML string sinks at the browser engine level, providing mathematical DOM XSS immunity.
3. **Sec-Fetch Protocol-Level Defense**:
   - Inspects `Sec-Fetch-Site` and `Sec-Fetch-Mode` on all requests to block cross-site API probing (`/api/telemetry`) and state mutations (`POST /api/gc`) with `403 Forbidden`.
4. **Adaptive Sliding-Window Rate Limiting**:
   - In-memory thread-safe sliding-window rate limiter throttles burst requests per IP, returning `429 Too Many Requests` with `Retry-After: 60` to mitigate DoS, thread exhaustion, and Slowloris attacks.
5. **Unified Security Headers & Network Isolation**:
   - Network binding restricted to `127.0.0.1` (loopback) by default.
   - Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`.
6. **Supply Chain Integrity & SAST Security Gates**:
   - Continuous scanning with CodeQL, `govulncheck`, `gosec`, and `gitleaks`.
   - Release binaries packaged with SPDX Software Bill of Materials (SBOM) and SLSA build provenance.

---

## Reporting a Vulnerability

If you discover a security vulnerability, please do not open a public issue. Instead, report it privately through GitHub Security Advisories or by contacting the maintainer via GitHub.

