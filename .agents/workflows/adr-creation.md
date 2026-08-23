# Workflow: ADR Creation & Maintenance

**Trigger**: When introducing a new architectural pattern, changing data flow, adding backend routes, or modifying security/storage invariants.  
**Purpose**: Ensure all architectural decisions are permanently documented, reasoned, and indexed.

---

## Procedure

### 1. Identify Next Sequence Number
Inspect `docs/adr/` to determine the next available 4-digit sequence number:
```powershell
Get-ChildItem docs/adr/ -Filter "????-*.md" | Sort-Object Name
```

### 2. Create the ADR Document (`docs/adr/NNNN-<short-title>.md`)
Use the standardized format:

```markdown
# ADR NNNN: <Decision Title>

## Status
[Proposed | Accepted | Superseded by NNNN]

## Context
Describe the problem, operational constraints, security requirements, and trade-offs.

## Decision
Detail the chosen approach, implementation mechanics, and why alternatives were rejected.

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative / Trade-offs
- Trade-off 1
- Maintenance cost
```

### 3. Update the ADR Catalog Index
Add the new record to [`docs/adr/README.md`](../../docs/adr/README.md) in the ADR index table:

```markdown
| [NNNN](NNNN-<short-title>.md) | **<Decision Title>** | Accepted | YYYY-MM-DD |
```

### 4. Cross-Reference Documentation
- Update `docs/architecture.md` if the decision affects system components or data flow.
- Update `README.md` and `AGENTS.md` if the change impacts developer workflows or agent governance.
