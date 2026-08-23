# Rule: Testing & Verification Standards

**Status**: Always On  
**Scope**: Code additions, refactors, bug fixes

---

## Verification Protocols

Before concluding any development task or proposing changes, the agent must execute the following verification steps:

1. **Automated Unit Tests**:
   - Run the Node.js native test runner:
     ```powershell
     node --test test_dashboard.js
     ```
   - All tests in `test_dashboard.js` must pass (0 failures, 0 skipped).
   - Any new calculation logic or state transformations added to `app.js` must have corresponding test cases in `test_dashboard.js`.

2. **Syntax & Lint Verification**:
   - Check JavaScript syntax:
     ```powershell
     node --check app.js
     node --check theme-init.js
     ```
   - Check Go formatting & static analysis (Go Report Card A+ Standards):
     ```powershell
     gofmt -s -d main.go
     go vet main.go
     ```

3. **Binary Compilation**:
   - If `main.go` is modified, recompile the Windows executable to keep it synchronized:
     ```powershell
     go build -o server.exe main.go
     ```
