# Contributing to E.'s Dev Dashboard

Thank you for your interest in contributing to **E.'s Dev Dashboard**!

---

## 1. Branching Model (Dev → Test → Production)

We maintain a strict branch hierarchy:
* **`production`**: Live, stable release branch (deployed automatically via GitHub Pages).
* **`test`**: Pre-release verification and staging branch.
* **`develop`**: Primary integration branch for active development.

### How to contribute:
1. **Branch Off `develop`**:
   ```powershell
   git checkout develop
   git checkout -b feature/your-feature-name develop
   ```
2. Make minimal, focused edits.
3. Ensure all tests and verification commands pass locally.
4. Push your branch and open a Pull Request targeting **`develop`**.

---

## 2. Commit Message Guidelines

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short imperative subject line <= 72 chars>

[Body explaining motivation, technical choices, and verification performed]
```

### Common Types:
- `feat`: New user-facing or platform functionality
- `fix`: Bug fix
- `docs`: Documentation updates
- `test`: Unit test additions or modifications
- `refactor`: Code restructuring without external behavior changes
- `chore`: Tooling, workflow, or governance updates

> **Note**: Pull Requests are automatically validated in CI via [`.github/workflows/commitlint.yml`](.github/workflows/commitlint.yml) to ensure strict adherence to Conventional Commits.

---

## 3. Local Verification Commands

Before opening a PR, run all native checks:

```powershell
# 1. Run Node.js Unit Tests with Coverage
node --test --experimental-test-coverage test_dashboard.js

# 2. Verify JavaScript Syntax
node --check app.js
node --check theme-init.js

# 3. Verify Go Formatting & Static Analysis
gofmt -s -d main.go
go vet main.go

# 4. Verify Go Compilation
go build -v main.go
```

---

## 4. Architectural Invariants
* **Zero External Dependencies**: Do NOT introduce `npm`, `package.json`, `node_modules`, or third-party Go dependencies.
* **Strict CSP**: Never add `'unsafe-inline'` or `'unsafe-eval'` to `index.html`.
* **Defensive Storage**: Encapsulate all `localStorage` access within `safeStorage` wrappers.
