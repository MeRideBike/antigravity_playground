# Rule: Architecture Preservation

**Status**: Always On  
**Scope**: All codebase modifications

---

## Architectural Invariants

1. **Zero External Dependencies**:
   - The frontend MUST remain plain HTML5, CSS3, and vanilla JavaScript.
   - Do NOT introduce build tools (Webpack, Vite, Rollup), UI frameworks (React, Vue, Svelte), CSS frameworks (Tailwind, Bootstrap), or runtime libraries.
   - The backend MUST remain single-file standard library Go (`net/http`, `os`, `encoding/json`, `flag`, `time`).

2. **Frontend Component Architecture**:
   - `index.html`: Semantic markup with strict Content Security Policy and accessible ARIA attributes.
   - `style.css`: CSS custom properties for theming, responsive layout via CSS Grid/Flexbox, WCAG AA contrast compliance, and `prefers-reduced-motion` support.
   - `theme-init.js`: Lightweight, synchronous script loaded in `<head>` to prevent Flash of Unstyled Content (FOUC) while avoiding inline scripts.
   - `app.js`: State-driven rendering pattern with pure calculation logic (`MetricCalculator`) separated from DOM operations, and Web Animations API for zero-reflow animations.

3. **Dual Execution Modes**:
   - The frontend MUST remain functional both when served via HTTP (`http://localhost:8080`) and when opened directly from the filesystem (`file:///` protocol / Local File Mode).
