# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is clarc?

clarc is a local Claude Code history browser — a full-stack TypeScript app that reads session data from `~/.claude/` and presents it through a web UI with search, analytics, bookmarks, and visualization. It supports Docker dev, standalone compiled binary, and native Tauri desktop app deployment.

## Development Commands

### Docker-based development (primary workflow)
```bash
make dev          # Start Vite (5173) + Hono (3838) + sync in Docker
make dev-bg       # Same, detached
make shell        # Shell into running container
make test         # Run bun test in container
make build        # Compile to dist-binary/clarc
make stop         # Stop containers
make clean        # Remove containers, volumes, rebuild
make add PKG=x    # Install a dependency
```

### Native development (requires Bun installed)
```bash
bun run dev           # Start Vite + Hono concurrently
bun run dev:client    # Vite dev server only
bun run build         # Full production build (client + server binary)
bun run preview       # Run server from source (no build needed)
bun test              # Run tests
```

### Tauri desktop app
```bash
make tauri-dev          # Native dev with HMR
make tauri-build-host   # Build on host (needs Bun + Rust)
make tauri-build        # Build in Docker container
```

## Architecture

### Layer overview
```
CLI (Commander) → Server (Hono :3838) → Data Layer (Scanner/Parser/Sync) → ~/.claude/
                                    ↕
                  Frontend (React 19 + Vite :5173)
```

The entry point (`src/cli/main.ts`) detects CLI commands vs server mode. If no recognized command, it imports and starts the Hono server.

### Source layout with path aliases
- `src/shared/` (`@shared`) — Types, path resolution, config, pricing logic. All core interfaces are in `types.ts`.
- `src/data/` (`@data`) — Scanner (index projects/sessions), Parser (JSONL→structured), Sync (copy `~/.claude/` → working dir), Stats.
- `src/server/` (`@server`) — Hono app with routes under `routes/`. All API endpoints prefixed `/api/`.
- `src/ui/` (`@ui`) — React SPA: `pages/` (10 pages), `components/` (~35), `hooks/` (useApi, useSettings, useKeyboard, useSessionNavigation).
- `src/cli/` — Commander program definition and main entry point.
- `src-tauri/` — Rust Tauri shell: spawns the compiled binary as a sidecar on a random port.

### Data flow
1. **Sync** copies `~/.claude/{projects,todos,stats-cache.json,history.jsonl}` into a working directory (add-only, never deletes from source).
2. **Scanner** indexes project directories and session `.jsonl` files into an in-memory `ClarcIndex` (cached, invalidated on sync).
3. **Parser** reads JSONL session files line-by-line, extracts messages/tool calls/tokens. LRU cache of 50 parsed sessions.
4. **API routes** query the index and parser, return JSON.
5. **Frontend** fetches from `/api/*` (proxied by Vite in dev).

### Key data safety rule
`~/.claude/` is treated as **read-only**. All writes go to the working data directory. Sync is add-only. Settings are read from source, never modified.

### Portable data directory logic (`src/shared/paths.ts`)
- Compiled binary: `data/` next to the executable
- Tauri sidecar: platform app data dir
- Dev mode: `~/.config/clarc/data/`
- All overridable via `CLARC_DATA_DIR` env var or `clarc.json` config

### Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `CLARC_CLAUDE_DIR` | `~/.claude` | Source data directory |
| `CLARC_DATA_DIR` | (computed) | Working data directory |
| `CLARC_PORT` | `3838` | API server port |
| `CLARC_SYNC_INTERVAL_MS` | `300000` | Sync interval (5 min) |

### Tauri sidecar pattern
The Tauri app (`src-tauri/src/lib.rs`) spawns the compiled `clarc-core` binary as a sidecar process, waits for the `__CLARC_READY__` stdout signal, then navigates the webview to that port. Do not change the readiness signal format in `src/server/index.ts`.

## Tech stack
- **Runtime**: Bun (fast JS runtime + single-binary compilation)
- **Backend**: Hono 4.x (TypeScript-first HTTP framework)
- **Frontend**: React 19 + React Router 7 + Tailwind CSS 4 (via `@tailwindcss/vite` plugin, not PostCSS) + Recharts
- **Build**: Vite 6 (dev proxy `/api` → `:3838`, polling watch for WSL2)
- **Desktop**: Tauri 2 with sidecar architecture
- **CLI**: Commander 13
- **Icons**: All inline SVGs in `src/ui/components/Icons.tsx` (no icon library)

## Conventions
- TypeScript strict mode. Path aliases (`@shared`, `@data`, `@server`, `@ui`) configured in both `tsconfig.json` and `vite.config.ts`.
- Frontend styling uses Tailwind utility classes plus CSS custom properties defined in `src/ui/styles/`.
- API routes are individual Hono routers in `src/server/routes/`, mounted on the main app in `src/server/index.ts`.
- Session JSONL format is documented in `DATAFORMAT.md`.
- Detailed architecture docs are in `docs/DEV_GUIDE.md`; user-facing docs in `docs/USER_GUIDE.md`.
