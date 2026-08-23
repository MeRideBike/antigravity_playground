# ADR 0001: Zero Runtime Framework Dependencies

## Status
Accepted

## Context
Modern frontend applications often rely on heavy framework ecosystems (React, Vue, Angular) and toolchains (Webpack, Vite, npm/node_modules) that introduce significant dependency overhead, supply-chain vulnerabilities, complex build steps, and substantial memory footprints for lightweight dashboard tools.

We required a developer dashboard that can:
1. Run instantly without any `npm install` or build step.
2. Be deployable anywhere (including static hosts like GitHub Pages or embedded into Go executables).
3. Maximize rendering performance and load times.

## Decision
We chose to build the user interface using **pure vanilla web standards** (HTML5, semantic CSS3 custom properties, ES6+ JavaScript, and native Web APIs like the Web Animations API and Fetch API).

- Pure calculation logic is isolated into testable modules (`MetricCalculator`).
- Native Node.js test runner (`node:test`) is used for verification with zero dev dependencies.

## Consequences

### Positive
- **Instant startup & zero build steps**: No node_modules, bundle sizes < 50KB total.
- **Zero supply chain attack surface**: No transitive third-party npm package vulnerabilities.
- **Universal compatibility**: Can run as static files, inside Go embedded file systems, or on GitHub Pages.

### Negative / Trade-offs
- Manual DOM state synchronization instead of declarative JSX/VDOM.
- Requires strict coding conventions and defensive state handling to maintain modularity.
