# Workflow: Documentation Maintenance

**Trigger**: Manual / Post-refactor / Release preparation  
**Purpose**: Ensure `README.md`, `AGENTS.md`, and `docs/` remain 100% accurate, consistent, and reflective of the current codebase.

---

## Step-by-Step Procedure

### 1. Codebase State Inspection
- Check for newly added, moved, or deleted files:
  ```powershell
  Get-ChildItem -Recurse -File | Select-Object FullName
  ```
- Identify any changes to:
  - Allowed Go server routes in `main.go`
  - CLI flags or environment variables (e.g. `-port`, `PORT`)
  - Metrics calculation parameters in `app.js`
  - UI structure / IDs in `index.html`

### 2. Documentation Audit
- **Project Structure**: Verify that the ASCII file tree in `README.md` and `docs/architecture.md` matches the actual filesystem.
- **CLI & Execution Commands**: Verify that all `go run`, `.\server.exe`, and `node --test` commands work exactly as written.
- **Security & Features Matrix**: Ensure any new endpoints or headers are documented under Security & Features.

### 3. File Updates
- Update `README.md` for user-facing instructions and overview.
- Update `docs/architecture.md` for technical invariants, data flows, and security policies.
- Update `AGENTS.md` if agent governance rules or workflow triggers have evolved.

### 4. Link & Verification Check
- Verify that all relative file links in markdown documents resolve cleanly.
- Ensure all test commands in the documentation pass before finalizing.
