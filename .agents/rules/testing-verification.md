# Rule: Testing & Verification Standards

**Status**: Always On  
**Scope**: Code additions, refactors, bug fixes, test coverage standards

---

## 1. Mandatory Verification Protocols

Before concluding any development task or proposing changes, the agent must execute the following verification steps:

1. **Automated Unit Tests & Native Coverage**:
   - Run the Node.js native test runner with coverage analysis:
     ```powershell
     node --test --experimental-test-coverage test_dashboard.js
     ```
   - All tests in `test_dashboard.js` must pass (0 failures, 0 skipped).

2. **JavaScript Syntax Verification**:
   ```powershell
   node --check app.js
   node --check theme-init.js
   ```

3. **Go Security & Integration Test Suite (`main_test.go`)**:
   - Run the automated Go backend security tests covering route whitelisting, HTTP method gating, path traversal fuzzing, and security header verification:
     ```powershell
     go test -v ./...
     ```

4. **Go Multi-Linter & Static Analysis Verification**:
   - Every Go change must pass all native static analysis checks with 0 warnings:
     ```powershell
     # 1. Format check
     gofmt -s -l .
     # 2. Compiler vet
     go vet ./...
     # 3. Static analysis & bugs
     staticcheck ./...
     # 4. Error check (including deferred Close calls)
     errcheck ./...
     # 5. Code style & doc comments (package comments required)
     revive ./...
     # 6. Ineffective assignment checks
     ineffassign ./...
     # 7. Official Go vulnerability database scan
     govulncheck ./...
     # 8. Go AST security and taint analysis
     gosec ./...
     ```

5. **Go Binary Compilation**:
   - Verify binary compiles cleanly without warnings:
     ```powershell
     go build -v ./...
     ```

---

## 2. Strict Pre-Approval Verification Gate (Zero Unverified Code Policy)

> [!CRITICAL]
> **Agents are STRICTLY FORBIDDEN from asking the user for merge, review, or promotion approval on code that has not been confirmed passing both locally and on remote CI.**

Before requesting approval from the user:
1. **Run Full Local Multi-Linter**: Execute all verification commands above locally.
2. **Push to Isolated Remote Branch**: Push commits to `origin/feature/*` or `origin/fix/*`.
3. **Verify Remote CI Execution**: Query the remote GitHub Actions CI status using the GitHub API (`/repos/:owner/:repo/actions/runs`) and verify that the run conclusion is **`success`**.
4. **Autonomous Triage on Failure**: If any remote CI check fails, the agent must automatically inspect the job step logs, identify the root cause, apply a fix to the branch, re-push, and verify a green CI run **before** contacting the user for promotion authorization.

---

## 3. Go Linter Invariants & Anti-Regression Rules

To prevent CI failures, agents must adhere to the following Go coding standards:
- **Package Comments**: Every package must start with a doc comment immediately above `package main` (e.g. `// Package main ...`).
- **Explicit Error Handling on Defer**: Never write bare `defer file.Close()`. Always explicitly handle or ignore errors: `defer func() { _ = file.Close() }()`.
---

## 4. Syllable-Level Context-Aware Coverage Standards for Developer Agents

When implementing features or bug fixes, developer agents MUST author unit tests covering every functional "syllable" in a context-aware manner:

### A. Pure Calculation & Algorithmic Units (`MetricCalculator`)
- **Boundary Clamping**: Assert behavior at exact bounds (e.g. queue min `0`, max `10`; spike lower bound `350`, upper bound `850`).
- **Fuzzing & Invariant Testing**: Run randomized / iteration loops (e.g. 100 iterations) to verify that non-deterministic outputs strictly adhere to mathematical constraints.
- **Delta & Threshold Calculations**: Verify calculation precision for deltas, percentages, and memory classification tags (`Low`, `Moderate`, `High`).

### B. State Transitions & Queue Lifecycles
- **Valid Transitions**: Verify state progression (`Queued` → `Success` / `Failed`).
- **FIFO Enforcement**: Assert that appending beyond capacity trims oldest items deterministically.
- **Search & Multi-Criteria Filtering**: Test exact queries, partial case-insensitive matches, severity filter subsets, and empty-set responses.

### C. Data Transformations & Schema Contracts
- **Serialization Formats**: Validate that `generateDiagnosticSnapshot` produces compliant JSON objects with all expected metadata keys and types.
- **Markdown & String Formatting**: Validate `formatMarkdownReport` against exact markdown table headers and escaped column output.
- **Unit Scale Conversions**: Test `formatBytes` across magnitude scales (`Bytes`, `KB`, `MB`, `GB`) and edge values (`0`, negative values, non-numbers).

### D. Defensive Wrappers & Failure Modes
- **Storage Failures**: Explicitly test `safeStorage` behavior under simulated `SecurityError`, missing `window.localStorage`, or `QuotaExceededError`.
- **Telemetry Fallbacks**: Validate `parseTelemetry` handling of malformed payloads, non-numeric values, or missing fields without throwing unhandled exceptions.
- **HTTP Routing Invariants**: In Go handlers, verify that whitelisted paths succeed while unwhitelisted paths return `404` and unsupported verbs return `405`.
