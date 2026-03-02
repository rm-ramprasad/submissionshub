# Stack

| Tool | Version | Notes |
|---|---|---|
| React | 19.2.0 | |
| Vite | 7.3.1 | |
| Tailwind CSS | 4.2.1 | Imported via `@import "tailwindcss"` in index.css |
| @microsoft/power-apps | 1.0.4 | SDK for Dataverse + `getContext()` |
| @microsoft/power-apps-vite | 1.0.2 | Vite plugin `powerApps()` |
| pac CLI | 2.3.2 | Has known bugs — see [known-issues.md](known-issues.md) |
| ESLint | 9.39.1 | react-hooks + react-refresh plugins |

## Tailwind v4 note

Tailwind v4 requires `@import "tailwindcss"` at the top of `index.css` — not the old `@tailwind base/components/utilities` directives. The `@tailwindcss/vite` plugin handles JIT compilation automatically via `vite.config.js`.
