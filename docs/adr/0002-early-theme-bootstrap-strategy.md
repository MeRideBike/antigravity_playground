# ADR 0002: Early Theme Bootstrap Strategy to Prevent FOUC

## Status
Accepted

## Context
When implementing dark/light mode themes, loading the theme logic in deferred scripts (`<script defer src="app.js">`) creates a visible Flash of Unstyled Content (FOUC) where the page temporarily renders with the light theme before snapping to dark mode once the DOM finishes parsing.

Furthermore, reading `localStorage` in strict sandboxed iframes or private browsing contexts can throw unhandled `SecurityError` or `TypeError` exceptions if not guarded defensively.

## Decision
1. **Isolated Bootstrap Script (`theme-init.js`)**:
   - A dedicated minimal script (~250 bytes) is loaded synchronously in the `<head>` prior to CSS stylesheet rendering.
   - Immediately determines the active theme (via `localStorage` or `prefers-color-scheme`) and sets the `data-theme` attribute on the `<html>` root element.

2. **Defensive Storage Wrapper (`safeStorage`)**:
   - All `localStorage` operations are encapsulated within `safeStorage` utilities with graceful memory-fallback and error suppression.

## Consequences

### Positive
- **Zero FOUC**: Dark theme is applied before the browser executes its first paint.
- **Sandboxed Resilience**: No runtime script crashes when running inside embedded iframes or privacy-restricted browsers.

### Negative / Trade-offs
- Adds a small discrete script file (`theme-init.js`) to the project structure instead of bundling everything into `app.js`.
