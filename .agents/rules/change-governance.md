# Rule: Change Governance & Dependency Management

**Status**: Always On  
**Scope**: All project modifications

---

## Change Scope Rules

1. **Strictly Minimal & Focused Edits**:
   - Only modify files directly related to the user request or assigned bug fix.
   - Do NOT rewrite working modules or reorganize folder hierarchies without explicit instruction.
   - Preserve existing comments, docstrings, and established code formatting.

2. **Dependency Management**:
   - Never run `npm init`, `npm install`, or introduce `node_modules` into this workspace.
   - Never add third-party Go modules (`go.mod`) unless explicitly approved by the user.
   - Rely solely on modern web platform native capabilities (Web Animations API, CSS custom properties, Fetch API, standard semantic HTML5 elements).
