# Workflow: Documentation Maintenance

**Trigger**: Manual / Post-refactor / Release preparation  
**Purpose**: Ensure `README.md`, `AGENTS.md`, `docs/`, `CONTRIBUTING.md`, `SECURITY.md`, and `docs/adr/` remain 100% accurate, consistent, and reflective of the current codebase.

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
  - GitHub workflows in `.github/workflows/`

### 2. Documentation & ADR Audit
- **Project Structure**: Verify that the ASCII file tree in `README.md` and `docs/architecture.md` matches the actual filesystem.
- **Architecture Decision Records**: Verify that all decisions in `docs/adr/` are listed in `docs/adr/README.md`.
- **Governance Files**: Ensure `CONTRIBUTING.md`, `SECURITY.md`, and `AGENTS.md` reflect current testing standards, branch names (`develop`, `test`, `production`), and Conventional Commits requirements.
- **CLI & Execution Commands**: Verify that all `go run`, `go vet`, and `node --test` commands work exactly as written.

### 3. File Updates
- Update `README.md` for user-facing instructions, badges, and overview.
- Update `docs/architecture.md` for technical invariants, component layout, and data flow.
- Update `AGENTS.md` if agent governance rules or workflow triggers have evolved.
- Update `CONTRIBUTING.md` and `SECURITY.md` for policy alignment.

### 4. Link & Verification Check
- Verify that all relative file links in markdown documents resolve cleanly.
- Ensure all test commands in the documentation pass before finalizing.
