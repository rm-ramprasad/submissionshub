# CLAUDE.md — SubmissionsHub

Power Apps Code App for bureau submission tracking. React + Vite + Tailwind CSS v4, deployed via `pac code push`.

---

## Commands

```bash
# Local development (run both in separate terminals)
pac code run --port 9000   # MUST use 9000 — port 8080 blocked by Windows HTTP.sys (PID 4)
npm run dev                # starts Vite on 5173

# Build & deploy
npm run build              # runs prebuild patch first, then vite build
pac code push              # MUST be run directly in VS Code terminal — not as subprocess

# Lint
npm run lint
```

---

## Docs

@docs/architecture.md
@docs/configuration.md
@docs/known-issues.md
@docs/stack.md
