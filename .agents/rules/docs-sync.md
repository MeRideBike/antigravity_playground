# Rule: Documentation Synchronization & Self-Documentation

**Status**: Always On  
**Scope**: All functional, architectural, security, or configuration changes

---

## Autonomous Documentation Sync Requirements

To maintain a self-documenting and self-maintaining codebase, agents MUST execute the following documentation updates automatically without requiring explicit reminders:

1. **Continuous Documentation Synchronization**:
   - **`README.md`**: Keep feature list, badge references, and ASCII project tree in exact parity with the filesystem.
   - **`docs/architecture.md`**: Update system diagrams, module descriptions, and security architecture whenever data flows, routes, or storage mechanisms change.
   - **`AGENTS.md`**: Update rule and workflow catalogs whenever `.agents/rules/` or `.agents/workflows/` are modified.
   - **`CONTRIBUTING.md` & `SECURITY.md`**: Keep verification commands, branching standards, and security policies synchronized.

2. **Mandatory Architecture Decision Records (ADRs)**:
   - When introducing or altering an architectural pattern (e.g. storage models, security headers, new endpoints, state handling):
     - Create a new ADR in `docs/adr/NNNN-<title>.md` following [`.agents/workflows/adr-creation.md`](../workflows/adr-creation.md).
     - Update the index table in `docs/adr/README.md`.

3. **No Orphaned Documentation**:
   - Obsolete flags, deleted routes, or renamed components must be immediately removed across all documentation during the same task.
   - Execute the [`.agents/workflows/documentation-maintenance.md`](../workflows/documentation-maintenance.md) checklist before concluding feature work.
