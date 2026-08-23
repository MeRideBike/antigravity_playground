# ADR 0004: OWASP ASVS Level 3, embed.FS Virtualization, Trusted Types & Advanced Security Standards

## Status
Accepted

## Context
As **E.'s Dev Dashboard** scales from standard local development tooling to enterprise high-assurance environments, it must comply with rigorous cybersecurity benchmarks:
1. **OWASP ASVS Level 3 (High Assurance)**: Requiring zero-trust network boundaries, strict protocol-level defenses, and anti-tampering virtualization.
2. **W3C Trusted Types**: Browser-engine enforced elimination of DOM-based Cross-Site Scripting (XSS).
3. **Go `embed.FS` Virtualization**: Eliminating runtime disk access, Local File Inclusion (LFI), and symlink traversal.
4. **Sec-Fetch Metadata Validation**: Protocol-level defense against Cross-Site Request Forgery (CSRF) and unauthorized cross-origin API probing.
5. **Adaptive Sliding-Window Rate Limiting**: In-memory IP request throttling to prevent thread exhaustion and DoS.
6. **SLSA Level 3 & NIST SP 800-218 (SSDF)**: Software supply chain integrity, hermetic builds, secret scanning, and automated SBOM generation.

## Decision
1. **Virtual Filesystem Virtualization (`embed.FS`)**:
   - Web assets (`index.html`, `style.css`, `app.js`, `theme-init.js`) are compiled directly into the binary using `//go:embed`.
   - `secureFileHandler` serves files exclusively from the in-memory virtual filesystem with zero host disk reads (`os.Open` eliminated).
2. **W3C Trusted Types Enforcement**:
   - CSP header and `<meta>` tag configured with `require-trusted-types-for 'script'; trusted-types default dashboardPolicy;`.
   - `app.js` initializes a `default` policy that throws `TypeError` on any dynamic HTML injection attempt.
3. **Sec-Fetch Request Metadata Validation**:
   - `secFetchMiddleware` inspects `Sec-Fetch-Site` and `Sec-Fetch-Mode` on all incoming requests.
   - Cross-site API calls (`/api/telemetry`) and state-mutating requests (`POST /api/gc`) are blocked with `403 Forbidden`. Top-level user navigations are permitted.
4. **In-Memory Sliding-Window Rate Limiter**:
   - A thread-safe `IPRateLimiter` tracks request frequency per client IP over a sliding window (100 req/min).
   - Excess requests receive `429 Too Many Requests` with `Retry-After: 60`. Stale entries are periodically pruned.
5. **Automated Security Pipelines & Supply Chain Attestation**:
   - Added `govulncheck` and `gosec` to CI verification.
   - Added `gitleaks` automated secret scanning.
   - Added SLSA Provenance and SBOM generation (SPDX) GitHub Actions workflow.

## Consequences

### Positive
- **LFI / Path Traversal Immunity**: Binary does not interact with the host filesystem at runtime; traversal attacks are structurally impossible.
- **Mathematical DOM XSS Prevention**: Browser engine refuses string-to-DOM conversions at runtime.
- **Protocol-Layer CSRF Immunity**: Cross-site requests are rejected prior to handler execution.
- **Supply Chain Assurance**: Machine-readable SBOMs and hermetic builds guarantee release provenance.

### Negative / Trade-offs
- Modifying static frontend assets for testing with `go run main.go` requires restarting the server process so `embed.FS` captures changes. (Direct browser opening via Local File Mode remains instantaneous).
