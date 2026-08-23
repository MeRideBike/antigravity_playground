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

2. **Syntax & Lint Verification**:
   - Check JavaScript syntax:
     ```powershell
     node --check app.js
     node --check theme-init.js
     ```
   - Check Go formatting & static analysis (`golangci-lint` standards):
     ```powershell
     gofmt -s -d main.go
     go vet main.go
     ```

3. **Binary Compilation**:
   - If `main.go` is modified, recompile the Windows executable to keep it synchronized:
     ```powershell
     go build -o server.exe main.go
     ```

---

## 2. Syllable-Level Context-Aware Coverage Standards for Developer Agents

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
