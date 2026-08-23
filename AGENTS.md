# Agent Governance & Development Guide: E.'s Dev Dashboard

Welcome to the **E.'s Dev Dashboard** repository. This document defines the operational boundaries, architectural invariants, and governance policies for AI agents and human contributors.

---

## 1. Project Overview & Core Philosophy

**E.'s Dev Dashboard** is a lightweight, self-contained local developer dashboard designed with **zero runtime external dependencies**. It consists of a vanilla frontend (HTML5/CSS3/JavaScript) and a minimal Go HTTP server that provides route whitelisting and health monitoring.

---

## 2. Agent Governance Hierarchy & Authority

When interacting with this codebase, agents must adhere to the following hierarchy:

1. **User Prompt & Constraints**: Explicit user requirements override default behaviors unless violating core security rules.
2. **Project Rules (`.agents/rules/`)**: Authoritative operational and architectural policies that are automatically applied.
3. **Root Guidelines (`AGENTS.md`)**: High-level repository structure and architectural invariants.
4. **Workflows (`.agents/workflows/`)**: Step-by-step procedures invoked on demand or during specific operations.
5. **Project Documentation (`docs/`, `README.md`)**: Reference material to be kept synchronized with code changes.

---

## 3. Active Rule Catalog

All agent interactions must respect the modular rules in [`.agents/rules/`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/):

- [`.agents/rules/architecture.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/architecture.md): Zero external dependencies, vanilla web standards, separation of theme bootstrap.
- [`.agents/rules/security.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/security.md): Strict CSP (`no unsafe-inline`), Go HTTP route whitelisting, source code/binary download protection.
- [`.agents/rules/testing-verification.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/testing-verification.md): Mandatory Node.js test runner (`node --test`), syntax checks (`node -c`), and Go compilation verification.
- [`.agents/rules/change-governance.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/change-governance.md): Minimal change scope, no framework introduction, defensive storage access.
- [`.agents/rules/docs-sync.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/rules/docs-sync.md): Synchronizing `README.md` and `docs/` alongside functional changes.

---

## 4. Key Workflows

- [`.agents/workflows/documentation-maintenance.md`](file:///c:/Users/ethan/OneDrive/Desktop/antigravity_playground/.agents/workflows/documentation-maintenance.md): Systematic procedure for auditing and updating project documentation after code refactoring or feature additions.

---

## 5. Git Branching & Promotion Workflow

The repository follows a structured **Dev → Test → Release** lifecycle:

```mermaid
gitGraph
   commit id: "Initial"
   branch develop
   checkout develop
   branch feature/new-widget
   checkout feature/new-widget
   commit id: "Feature Work"
   checkout develop
   merge feature/new-widget id: "Merge to Dev"
   checkout test
   merge develop id: "Promote to Test"
   checkout main
   merge test id: "Release to Main" tag: "v1.0"
```

1. **Feature & Agent Branches (`feature/*`, `agent/*`, `fix/*`)**:
   - Created off `develop`.
   - Used for individual tasks, whether coded manually by the user or autonomously by subagents.
2. **Development Baseline (`develop`)**:
   - Active aggregation branch for ongoing development.
   - All unit tests (`node --test`) and Go verification must pass before merging.
3. **Testing / Staging (`test`)**:
   - Pre-release validation branch.
   - Used for staging end-to-end integration and manual verification.
4. **Release (`main`)**:
   - Protected, production-ready release branch. Only promoted from verified `test` builds.
