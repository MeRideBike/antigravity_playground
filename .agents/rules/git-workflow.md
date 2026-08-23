# Rule: Git Branching, Commit Standards & Role Boundaries

**Status**: Always On  
**Scope**: All version control operations, agent workflows, commits, and promotions

---

## 1. Feature Branch Isolation

- **Branch Off `develop`**: Every new feature, bug fix, or agent task MUST start on an isolated branch created off `develop`:
  - Features: `feature/<feature-name>` (e.g. `feature/timer-widget`)
  - Agent tasks: `agent/<task-name>` (e.g. `agent/a11y-audit`)
  - Fixes: `fix/<issue-name>` (e.g. `fix/csp-violation`)
- **Direct Commits Prohibited**: Agents and developers MUST NOT commit feature work directly to `develop`, `test`, or `production`.

---

## 2. Enterprise "Golden Standard" Commit Guidelines

All commits created by agents or human contributors must strictly follow the **Conventional Commits** standard:

### Format
```text
<type>(<scope>): <short imperative summary>

[optional body explaining motivation, context, and technical choices]

[optional footer with issue references or breaking change notices]
```

### Allowed Types
- `feat`: New feature or user-visible functionality
- `fix`: Bug fix
- `docs`: Documentation updates only (e.g., `README.md`, `docs/`, `AGENTS.md`)
- `style`: Formatting, missing semicolons, white-space changes (no code logic change)
- `refactor`: Code restructuring without changing external behavior or adding features
- `test`: Adding or modifying test cases (`test_dashboard.js`)
- `chore`: Maintenance, updating `.gitignore`, `.agents/rules/`, build scripts
- `perf`: Performance improvements

### Subject Line Rules
- Use imperative, present tense: `"add feature"` (NOT `"added"` or `"adds"`).
- Lowercase start, no trailing period (`.`).
- Maximum 72 characters.

### Commit Body Rules
- Explain the **why** (motivation and rationale), not just repeating the what.
- Mention verification performed (e.g. `"Validated with node --test and node -c"`).

### Automated PR Gatekeeping
- Pull Requests opened against `develop`, `test`, or `production` are automatically validated by the [`.github/workflows/commitlint.yml`](../../.github/workflows/commitlint.yml) GitHub Action. Non-conforming PR titles or commit headers will be rejected.

---

## 3. Agent Task & Role Boundaries (Separation of Concerns)

To maintain strict release integrity, development and merging are separated into distinct steps:

1. **Development Agents**:
   - Create and work solely within `feature/*` or `agent/*`.
   - Run verification checks (`node --test test_dashboard.js`, `node -c`, `go vet`).
   - Create golden standard commit(s).
   - Push the branch to remote (`git push -u origin <branch-name>`).
   - **STOP HERE**: Development agents must **never** auto-merge into `develop`, `test`, or `production`.

2. **Reconciliation / Merge / Release Tasks**:
   - Merging into `develop`, resolving merge conflicts, and promoting from `develop` → `test` → `production` is handled as an independent review task or by a designated merge agent/user request.

---

## 4. Autonomous Pull Request Review & Approval Protocol

When encountering or handling open Pull Requests (including automated bot PRs like Dependabot):

1. **Inspection & Invariant Check**:
   - Agents must inspect the incoming diff, target base branch, and CI check results.
   - Verify that all changes respect the **Zero External Dependencies** and **Strict CSP** invariants.

2. **Base Branch Alignment**:
   - Automated PRs must target **`develop`**. If a bot or contributor targets `production` or `test`, the agent must retarget or consolidate the update into `develop`.

3. **Proactive Review & Approval Request**:
   - When a PR falls within the agent's task scope, the agent must summarize the impact, verify local tests (`node --test`), and request explicit user authorization with a clear merge/promotion plan before executing promotions.
