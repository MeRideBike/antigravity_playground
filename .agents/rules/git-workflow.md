# Rule: Git Branching, Commit Standards & Role Boundaries

**Status**: Always On  
**Scope**: All version control operations, agent workflows, commits, and promotions

---

## 1. Feature Branch Isolation

- **Branch Off develop**: Every new feature, bug fix, or agent task MUST start on an isolated branch created off develop:
  - Features: eature/<feature-name> (e.g. eature/timer-widget)
  - Agent tasks: gent/<task-name> (e.g. gent/a11y-audit)
  - Fixes: ix/<issue-name> (e.g. ix/csp-violation)
- **Direct Commits Prohibited**: Agents and developers MUST NOT commit feature work directly to develop, 	est, or main.

---

## 2. Enterprise "Golden Standard" Commit Guidelines

All commits created by agents or human contributors must strictly follow the **Conventional Commits** standard:

### Format
`	ext
<type>(<scope>): <short imperative summary>

[optional body explaining motivation, context, and technical choices]

[optional footer with issue references or breaking change notices]
`

### Allowed Types
- eat: New feature or user-visible functionality
- ix: Bug fix
- docs: Documentation updates only (e.g., README.md, docs/, AGENTS.md)
- style: Formatting, missing semicolons, white-space changes (no code logic change)
- efactor: Code restructuring without changing external behavior or adding features
- 	est: Adding or modifying test cases (	est_dashboard.js)
- chore: Maintenance, updating .gitignore, .agents/rules/, build scripts
- perf: Performance improvements

### Subject Line Rules
- Use imperative, present tense: "add feature" (NOT "added" or "adds").
- Lowercase start, no trailing period (.).
- Maximum 72 characters.

### Commit Body Rules
- Explain the **why** (motivation and rationale), not just repeating the what.
- Mention verification performed (e.g. "Validated with node --test and node -c").

---

## 3. Agent Task & Role Boundaries (Separation of Concerns)

To maintain strict release integrity, development and merging are separated into distinct steps:

1. **Development Agents**:
   - Create and work solely within eature/* or gent/*.
   - Run verification checks (
ode --test test_dashboard.js, 
ode -c, go vet).
   - Create golden standard commit(s).
   - Push the branch to remote (git push -u origin <branch-name>).
   - **STOP HERE**: Development agents must **never** auto-merge into develop, 	est, or main.

2. **Reconciliation / Merge / Release Tasks**:
   - Merging into develop, resolving merge conflicts, and promoting from develop → 	est → main is handled as an independent review task or by a designated merge agent/user request.
