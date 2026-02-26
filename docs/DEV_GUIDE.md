# clarc Developer Guide

A comprehensive guide for developers working on clarc v0.2.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Docker Development Environment](#docker-development-environment)
5. [Project Structure](#project-structure)
6. [Shared Layer](#shared-layer)
7. [Data Layer](#data-layer)
8. [API Layer](#api-layer)
9. [Frontend Layer](#frontend-layer)
10. [CLI Layer](#cli-layer)
11. [Styling & Theming](#styling--theming)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Data Format Reference](#data-format-reference)
14. [Adding New Features](#adding-new-features)
15. [Building for Production](#building-for-production)
16. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

clarc is a full-stack TypeScript application with five layers:

```
                    +-----------------+
                    |   Browser UI    |
                    | React 19 + Vite |
                    +--------+--------+
                             |
                    +--------v--------+
                    |    Hono API     |
                    |  Port 3838      |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |   Data Layer     |          |   CLI Layer     |
     | Scanner, Parser  |          | Commander       |
     +--------+---------+          +--------+--------+
              |                             |
     +--------v--------+          +--------v--------+
     |   Sync Layer     |<---------| preAction hook  |
     | sync.ts engine   |          +-----------------+
     +--+------------+--+
        |            |
   +----v----+  +----v----+
   |SOURCE_DIR|  | DATA_DIR|
   |~/.claude/|  |(see note)|
   |(read-only)|  |(r/w)    |
   +----------+  +---------+
```

**DATA_DIR location depends on how clarc is running:**
- **Compiled binary** (`./clarc`): `data/` next to the executable (portable)
- **Dev mode** (`bun run` / Docker): `~/.config/clarc/data/`
- **Explicit override**: `CLARC_DATA_DIR` env var takes priority in all cases

**Key principles:**
- clarc **never modifies** user data in `~/.claude/`. All access to that directory is read-only.
- A transparent sync layer copies data from `~/.claude/` (source) into `DATA_DIR` (local working copy). All reads go through the working copy.
- Sync is **add-only** (never deletes files from the working copy) and runs at startup, every 5 minutes, and on demand.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Bun 1.x | Fast JavaScript runtime, single-binary compilation |
| Backend | Hono 4.x | Lightweight HTTP framework |
| Frontend | React 19, React Router 7 | SPA with client-side routing |
| Styling | Tailwind CSS 4.1 | Utility-first CSS via Vite plugin |
| Design System | CSS custom properties, utility classes | ~50 tokens, 15 keyframe animations, glass/card/skeleton utilities |
| Typography | Inter (UI), JetBrains Mono (code) | Google Fonts loaded in `index.html` |
| Markdown | react-markdown, remark-gfm | Renders markdown content |
| Charts | Recharts 2.x | Data visualization (6 chart types wired across Dashboard and Analytics) |
| Icons | Custom inline SVGs (`Icons.tsx`) | ~35 icons, no external icon library |
| CLI | Commander 13 | Command-line interface |
| Build | Vite 6.x | Frontend bundling and HMR |
| Container | Docker + Docker Compose | Isolated development environment |
| Sync | Custom sync engine | Copies `~/.claude/` to `~/.config/clarc/data/` |

---

## Prerequisites

- **Docker** and **Docker Compose** (v2+) installed on the host
- A `~/.claude/` directory with Claude Code session data
- That's it. Nothing else needs to be installed on the host.

---

## Getting Started

```bash
# Clone or enter the project directory
cd ClArc

# Start the development environment (first time builds the container)
make dev

# This starts:
#   - Vite dev server on http://localhost:5173 (with HMR)
#   - Hono API server on http://localhost:3838
#   - Initial sync: ~/.claude/ → ~/.config/clarc/data/ inside the container
#   - Periodic sync every 5 minutes

# Open the app
open http://localhost:5173
```

### Key Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start dev servers (foreground) |
| `make dev-bg` | Start dev servers (background) |
| `make shell` | Open a shell inside the container |
| `make test` | Run Bun tests |
| `make build` | Compile production binary to `./dist-binary/clarc` |
| `make stop` | Stop all containers |
| `make clean` | Remove containers, volumes, and built binaries |
| `make logs` | Tail container logs |
| `make add PKG=<name>` | Install a new dependency |
| `make tauri-build` | Build Tauri desktop app via Docker (Linux `.deb`/`.rpm`) |
| `make tauri-build-host` | Build Tauri desktop app on host (requires Bun + Rust) |
| `make tauri-dev` | Run Tauri dev mode on host (native window + HMR) |
| `make tauri-icons` | Generate app icons from source PNG |

### Golden Rule

**Never run `bun install`, `bun dev`, or any build commands directly on the host.** Everything runs inside Docker. Edit files on the host; run commands through Docker.

---

## Docker Development Environment

### Container Architecture

The `docker-compose.yml` defines three services:

#### `clarc` (main dev container)

- **Ports**: 3838 (API), 5173 (Vite)
- **Volumes**:
  - `.:/app` — Source code (read-write, live editing)
  - `/app/node_modules` — Isolated deps (prevents host/container conflicts)
  - `${HOME}/.claude:/home/claude-data:ro` — Claude data (READ-ONLY)
  - `${HOME}/.config/clarc:/home/clarc-config` — clarc config and sync data (read-write)
- **Environment**:
  - `CLARC_CLAUDE_DIR=/home/claude-data`
  - `CLARC_CONFIG_DIR=/home/clarc-config`
  - `CLARC_PORT=3838`
  - `HOST=0.0.0.0`

The sync layer copies files from `/home/claude-data` (the read-only mount) into `/home/clarc-config/data/` (the read-write config volume). All scanner and parser reads go through the config volume.

#### `build` (one-shot binary compilation)

- Activated with `make build` or `docker compose run --rm build`
- Runs `vite build` + `bun build --compile`
- Outputs binary to `./dist-binary/clarc` on the host

#### `tauri-build` (Tauri desktop app compilation)

- Activated with `make tauri-build` or `docker compose run --rm tauri-build`
- Uses `Dockerfile.tauri` (Ubuntu 24.04 + Bun + Rust + WebKit2GTK libs)
- Build steps: Vite frontend build → Bun sidecar compilation → Rust/Tauri compilation → `.deb`/`.rpm` bundling
- Outputs to `./dist-tauri/deb/` and `./dist-tauri/rpm/` on the host
- AppImage is skipped in Docker (requires FUSE, unavailable in containers)
- Note: The Tauri build compiles ~200+ Rust crates on first run (~2-3 min); subsequent builds are faster due to Docker layer caching

### WSL2 Notes

The Vite config includes `server.watch.usePolling = true` with a 1-second interval because WSL2's cross-filesystem mount (Windows NTFS -> Linux) doesn't support inotify properly. This enables file watching to work correctly for HMR.

### Workflow

```
HOST (your terminal / Claude Code)          DOCKER CONTAINER
┌─────────────────────────┐                ┌──────────────────────┐
│ Edit source files        │ ──volume──>   │ /app/src/...         │
│ (normal file operations) │                │                      │
│                          │                │ Vite watches changes │
│ make dev / make shell    │ ──docker──>   │ HMR reloads browser  │
│ make add PKG=react       │ ──docker──>   │ bun add react        │
│ make test                │ ──docker──>   │ bun test             │
│ make build               │ ──docker──>   │ compile binary       │
│                          │ <──volume──   │ → dist-binary/clarc  │
└─────────────────────────┘                └──────────────────────┘
```

---

## Project Structure

```
ClArc/
├── Dockerfile                    # Container image definition (Alpine + Bun)
├── Dockerfile.tauri              # Tauri build container (Ubuntu 24.04 + Bun + Rust)
├── docker-compose.yml            # Service orchestration (clarc, build, tauri-build)
├── Makefile                      # Convenience commands
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build and dev config
├── index.html                    # HTML entry point (loads Inter + JetBrains Mono)
├── .dockerignore                 # Docker build exclusions
├── .gitignore                    # Git exclusions
├── DATAFORMAT.md                 # ~/.claude/ data format documentation
│
├── .github/
│   └── workflows/
│       └── release.yml           # Cross-platform CI (Linux, macOS, Windows)
│
├── docs/
│   ├── DEV_GUIDE.md              # This file
│   ├── USER_GUIDE.md             # End-user guide
│   └── TAURI_PLAN.md             # Tauri architecture plan
│
├── src-tauri/                    # Tauri v2 desktop app (Rust)
│   ├── Cargo.toml                # Rust dependencies
│   ├── build.rs                  # Tauri build script
│   ├── tauri.conf.json           # App config, window, CSP, sidecar, plugins
│   ├── capabilities/
│   │   └── default.json          # Shell sidecar and process permissions
│   ├── loading/
│   │   └── index.html            # Animated splash screen (shown while sidecar starts)
│   ├── icons/                    # App icons (all sizes + .ico/.icns)
│   ├── binaries/                 # Sidecar binaries (clarc-core-{target}, gitignored)
│   └── src/
│       ├── lib.rs                # Core: port discovery, sidecar spawn, system tray
│       └── main.rs               # Rust entry point
│
├── src/
│   ├── shared/                   # Shared across all layers
│   │   ├── config.ts             # clarc.json config file I/O, validation, types
│   │   ├── paths.ts              # Centralized path configuration (SOURCE_DIRS, DATA_DIR, etc.)
│   │   ├── types.ts              # All TypeScript interfaces (including sync types)
│   │   ├── wsl-detect.ts         # WSL detection + Windows Claude dir auto-discovery
│   │   └── pricing.ts            # Model pricing & cost estimation
│   │
│   ├── data/                     # Data access layer
│   │   ├── sync.ts               # Multi-source sync engine: SOURCE_DIRS → DATA_DIR (add-only, merged)
│   │   ├── sync-scheduler.ts     # Startup sync + periodic 5min sync timer
│   │   ├── scanner.ts            # Project/session discovery + token extraction
│   │   ├── parser.ts             # Session JSONL parsing + LRU cache
│   │   ├── tasks.ts              # Todo file parsing
│   │   └── stats.ts              # Analytics computation from stats-cache
│   │
│   ├── server/                   # HTTP API
│   │   ├── index.ts              # Hono app, middleware, static serving, sync init
│   │   └── routes/               # Route handlers
│   │       ├── projects.ts       # GET /api/projects[/:id]
│   │       ├── sessions.ts       # GET /api/sessions/:id, /bookmarks, /agents/...
│   │       ├── tasks.ts          # GET /api/tasks[/:sessionId]
│   │       ├── analytics.ts      # GET /api/analytics[/model-usage|cost|heatmap]
│   │       ├── search.ts         # GET /api/search?q=...
│   │       ├── export.ts         # GET /api/export/session/:id[/preview]
│   │       ├── system.ts         # GET /api/status, /settings/info, POST /settings/config, /reindex
│   │       └── sync.ts           # GET /api/sync/status, POST /api/sync
│   │
│   ├── cli/                      # Command-line interface
│   │   ├── main.ts               # Entry point (CLI vs server mode detection)
│   │   └── index.ts              # Command definitions (preAction sync hook)
│   │
│   └── ui/                       # React frontend
│       ├── main.tsx              # React DOM mount
│       ├── App.tsx               # Route definitions
│       ├── styles/
│       │   └── globals.css       # Design system: tokens, animations, utility classes
│       ├── hooks/
│       │   ├── useApi.ts         # Fetch wrapper with loading/error states
│       │   ├── useKeyboard.ts    # Global keyboard shortcut handler
│       │   ├── useSettings.ts    # localStorage-backed settings (theme, collapse, thinking)
│       │   └── useSessionNavigation.ts  # [ ] navigation between sessions
│       ├── components/
│       │   ├── Layout.tsx        # App shell (sidebar + main + overlays + context panel)
│       │   ├── Sidebar.tsx       # Project navigation (text-gradient logo, nav icons)
│       │   ├── MessageRenderer.tsx # Core message display (avatars, bubbles, cost badges)
│       │   ├── CollapsibleContent.tsx # Generic height-based collapse with sticky pill
│       │   ├── ThinkingBlock.tsx  # Collapsible thinking (animated, gradient border)
│       │   ├── ToolCallBlock.tsx  # Collapsible tool call (per-tool icons, panel support)
│       │   ├── CodeBlock.tsx      # Code block (macOS dots, copy animation)
│       │   ├── KeyboardShortcuts.tsx # Shortcut overlay (backdrop blur, scaleIn, key styling)
│       │   ├── Icons.tsx          # ~35 inline SVG icons (no external library)
│       │   ├── Skeleton.tsx       # Shimmer loading placeholders
│       │   ├── PageTransition.tsx # Route-keyed fadeInUp animation wrapper
│       │   ├── StatCard.tsx       # Gradient-bordered stat cards
│       │   ├── ChartCard.tsx      # Recharts wrapper card
│       │   ├── EmptyState.tsx     # Empty state with icon
│       │   ├── Badge.tsx          # Standardized pill badge
│       │   ├── Tooltip.tsx        # Pure CSS tooltip
│       │   ├── ContextPanelProvider.tsx # React context for side panel state
│       │   ├── ContextPanel.tsx   # 480px slide-in panel (agents, tools, previews)
│       │   ├── SessionTimeline.tsx # Vertical timeline with date grouping
│       │   ├── ConversationTurn.tsx # Groups user + assistant messages into turns
│       │   ├── ScrollProgress.tsx # Thin scroll progress bar
│       │   └── ScrollNav.tsx      # Floating jump-to-top/bottom pill
│       └── pages/
│           ├── Dashboard.tsx      # Gradient hero, recharts AreaChart, StatCards
│           ├── ProjectDetail.tsx  # SessionTimeline, clickable agents opening panel
│           ├── SessionDetail.tsx  # Glass header, ConversationTurns, scroll nav
│           ├── Analytics.tsx      # 6 recharts, heatmap, circular cache indicator
│           ├── Search.tsx         # Glass search bar, staggered results
│           ├── Tasks.tsx          # Colored column headers, pulsing blocked dots
│           ├── MarkdownPreview.tsx # Glass toolbar, toggle switches
│           ├── Help.tsx           # In-app help/guide page
│           └── Settings.tsx       # Settings page (theme, collapse, thinking, editable data, archives)
│
└── dist-binary/                  # Compiled binary output
    └── clarc                     # Single standalone executable
```

---

## Shared Layer

### `src/shared/config.ts` — Config File I/O

Handles reading, writing, and validating `clarc.json`. This is the foundation for the config file system.

**Config file location** (same portable logic as DATA_DIR):
- Binary mode (`basename(process.execPath) === 'clarc'`): `clarc.json` next to the binary
- Dev/Docker mode: `$CLARC_CONFIG_DIR/clarc.json` or `~/.config/clarc/clarc.json`

```typescript
interface ClarcConfig {
  sourceDir?: string;       // Single source (backward compat)
  sourceDirs?: string[];    // Multiple source directories
  dataDir?: string;         // Synced data location
  port?: number;            // Web server port
  syncIntervalMs?: number;  // Sync interval in ms
}

getConfigFilePath(): string           // Resolve clarc.json path
readConfigSync(): ClarcConfig         // Synchronous read (for module-level use in paths.ts)
readConfig(): Promise<ClarcConfig>    // Async read (for API endpoints)
validateConfig(config): Promise<{ valid, errors, warnings }>
writeConfig(config): Promise<void>
```

**Validation rules:**
- `sourceDirs`: Each entry must contain a `projects/` subdirectory (Claude Code profile marker). Errors keyed as `sourceDirs[0]`, `sourceDirs[1]`, etc.
- `sourceDir` (legacy): Same validation, only checked when `sourceDirs` is not set
- `dataDir`: Must be writable (attempts mkdir + test file write/delete)
- `port`: Integer 1–65535
- `syncIntervalMs`: Integer >= 10000 (10 seconds minimum)

### `src/shared/paths.ts` — Path Configuration

**Critical:** All file system paths in the entire application flow through this module. Never hardcode `~/.claude` or `/home/claude-data` anywhere else.

Resolution priority: **env var > config file (`clarc.json`) > default**.

```typescript
import { readConfigSync, getConfigFilePath } from './config';

const _config = readConfigSync(); // Load config once at module init

function parseIntOrUndefined(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

export const CONFIG_FILE = getConfigFilePath();

// Source dirs: env var (colon-separated) > config sourceDirs > config sourceDir > default
function resolveSourceDirs(): string[] { ... }  // deduplicates paths
export const SOURCE_DIRS: string[] = resolveSourceDirs();
export const SOURCE_DIR: string = SOURCE_DIRS[0];  // Backward compat

export const CONFIG_DIR = process.env.CLARC_CONFIG_DIR || join(homedir(), '.config', 'clarc');
export const PORT = parseIntOrUndefined(process.env.CLARC_PORT) ?? _config.port ?? 3838;
export const SYNC_INTERVAL_MS = parseIntOrUndefined(process.env.CLARC_SYNC_INTERVAL_MS) ?? _config.syncIntervalMs ?? 300000;
export const DATA_DIR = process.env.CLARC_DATA_DIR ?? _config.dataDir ?? getDefaultDataDir();

function getDefaultDataDir(): string { ... }  // Tauri / compiled / dev mode

// Derived paths — point to local data copy (populated by sync)
export const PROJECTS_DIR = join(DATA_DIR, 'projects');
export const TODOS_DIR = join(DATA_DIR, 'todos');
export const HISTORY_FILE = join(DATA_DIR, 'history.jsonl');
export const STATS_FILE = join(DATA_DIR, 'stats-cache.json');
export const SYNC_STATE_FILE = join(DATA_DIR, 'sync-state.json');

// These are NOT synced — always read from primary source
export const PLANS_DIR = join(SOURCE_DIR, 'plans');
export const FILE_HISTORY_DIR = join(SOURCE_DIR, 'file-history');
export const SETTINGS_FILE = join(SOURCE_DIR, 'settings.json');
```

**Note:** Uses `??` (nullish coalescing) instead of `||` for correct numeric resolution — avoids the `0 || default` pitfall where falsy values like `0` would incorrectly fall through to the default.

**Portable data directory logic:**

`DATA_DIR` is resolved at runtime using this priority:

1. `CLARC_DATA_DIR` env var (explicit override — always wins)
2. Compiled binary (`basename(process.execPath) === 'clarc'`) → `data/` next to the binary
3. Dev mode (bun/node runtime) → `~/.config/clarc/data/`

This means:
- **Compiled binary**: `./clarc` stores synced data in `./data/` and config in `./clarc.json` — copy the binary + `data/` folder + `clarc.json` to a new machine to preserve all history and settings
- **Dev mode / Docker**: `process.execPath` is `bun`, so it falls back to `~/.config/clarc/data/` (Docker: `/home/clarc-config/data/`) and config at `~/.config/clarc/clarc.json`
- **Custom path**: `CLARC_DATA_DIR=/my/path clarc` overrides everything

**Data flow:**

| Variable | Points To | Access | Notes |
|----------|-----------|--------|-------|
| `SOURCE_DIR` | `~/.claude/` | Read-only | Where Claude Code writes data |
| `CONFIG_DIR` | `~/.config/clarc/` | Read-write | clarc's own config/state |
| `DATA_DIR` | *(see above)* | Read-write | Sync'd working copy (portable) |
| `PROJECTS_DIR` | `DATA_DIR/projects/` | Read-write | Synced from `SOURCE_DIR/projects/` |
| `TODOS_DIR` | `DATA_DIR/todos/` | Read-write | Synced from `SOURCE_DIR/todos/` |
| `STATS_FILE` | `DATA_DIR/stats-cache.json` | Read-write | Synced from `SOURCE_DIR/stats-cache.json` |
| `HISTORY_FILE` | `DATA_DIR/history.jsonl` | Read-write | Synced from `SOURCE_DIR/history.jsonl` |
| `SYNC_STATE_FILE` | `DATA_DIR/sync-state.json` | Read-write | Tracks sync state (travels with data) |
| `PLANS_DIR` | `SOURCE_DIR/plans/` | Read-only | Not synced |
| `SETTINGS_FILE` | `SOURCE_DIR/settings.json` | Read-only | Not synced |

### `src/shared/types.ts` — Type Definitions

Contains all TypeScript interfaces shared across layers. Key types:

| Type | Used By | Description |
|------|---------|-------------|
| `ClarcIndex` | Scanner, API | Top-level index of all projects |
| `Project` | Scanner, API | Project with sessions, agents, tasks |
| `SessionRef` | Scanner | Lightweight session reference with `tokenUsage?` and `estimatedCostUsd?` |
| `Session` | Parser, API | Fully parsed session with messages |
| `Message` | Parser, UI | Individual message with content blocks |
| `ThinkingBlock` | Parser, UI | Extended thinking content |
| `ToolCall` | Parser, UI | Tool invocation + result |
| `ContentBlock` | Parser, UI | Typed content (text, tool_use, tool_result) |
| `TokenUsage` | Scanner, Pricing | Input/output/cache token counts |
| `GlobalStats` | Stats | From `stats-cache.json` |
| `Analytics` | Stats, API | Computed analytics dashboard data |
| `SearchResult` | Search, API | Search hit with snippet |
| `TaskList` / `Task` | Tasks, API | Todo items |
| `SyncState` | Sync | Persistent sync state v2 (sourceDirs, file inventory with sourceIndex, counters) |
| `SyncedFile` | Sync | Individual synced file record (sourceIndex, mtime, size, syncedAt) |
| `SyncError` | Sync | Error during sync (timestamp, path, message) |
| `SyncStatus` | Sync, API | Current sync status (sourceDirs + sourceDir compat) |

### `src/shared/pricing.ts` — Cost Estimation

Defines per-model pricing ($ per million tokens) and provides:

```typescript
// Get pricing for a model (with fuzzy matching by family)
getPricing(model: string): ModelPricing

// Calculate cost from token usage
estimateCost(model: string, usage: TokenUsage): number
```

**Default pricing:**

| Model | Input | Output | Cache Read | Cache Create |
|-------|-------|--------|------------|--------------|
| Sonnet 4 | $3 | $15 | $0.30 | $0.75 |
| Opus 4.5 / 4.6 | $15 | $75 | $1.50 | $3.75 |
| Haiku 4.5 | $0.25 | $1.25 | $0.025 | $0.0625 |

---

## Data Layer

The data layer reads synced data from `DATA_DIR` (populated by sync from `~/.claude/`) and produces typed structures for the API and CLI. It **never modifies** the source directory.

### `src/data/sync.ts` — Sync Engine

The sync engine is the foundation of v0.2's data architecture. It copies data from all `SOURCE_DIRS` to `DATA_DIR` (portable — see paths.ts section above), keeping a merged local read-write working copy.

#### How it works

1. Iterates each source directory in `SOURCE_DIRS` (index 0, 1, 2...).
2. For each source, an allowlist defines what to sync:
   - `projects/` directory (`.jsonl` and `.txt` files — flat-merged, no collisions due to path-encoded project IDs)
   - `todos/` directory (only `.json` files — flat-merged)
   - `stats-cache.json` (last-wins across sources)
   - `history.jsonl` (copied per-source as `history-{N}.jsonl`, then merged with dedup by `sessionId:timestamp`)
3. Walks each directory recursively, comparing `mtime` + `size` against the stored file inventory
4. Only copies files that are new or have changed (mtime/size differ)
5. **Never deletes** files from the working copy (add-only)
6. Tracks all synced files in `sync-state.json` with per-file metadata. Inventory keys are prefixed with source index: `{sourceIndex}:{relativePath}`
7. Caps stored errors at 50
8. Auto-migrates v1 sync state (single `sourceDir`) to v2 (`sourceDirs` + prefixed inventory keys)

#### Public API

```typescript
// Run a full sync cycle. Returns status. No-ops if already syncing.
runSync(): Promise<SyncStatus>

// Get current sync status without triggering a sync
getSyncStatus(): SyncStatus

// Check if this is a fresh install (no sync-state.json exists)
needsInitialSync(): Promise<boolean>
```

#### SyncStatus shape

```typescript
{
  lastSyncAt: string | null;
  lastSyncDurationMs: number;
  syncCount: number;
  sourceDir: string;       // Compat: first source dir
  sourceDirs: string[];    // All configured source directories
  totalFiles: number;
  totalSizeBytes: number;
  errors: SyncError[];
  isSyncing: boolean;
}
```

### `src/data/sync-scheduler.ts` — Sync Scheduling

Manages the sync lifecycle:

```typescript
// Run initial sync at startup (blocks until complete)
initSync(): Promise<void>

// Start periodic sync timer (default: every 5 minutes via SYNC_INTERVAL_MS)
startPeriodicSync(intervalMs?: number): void

// Stop the periodic timer
stopPeriodicSync(): void

// Restart with a new interval (used for hot-reload when config changes)
restartPeriodicSync(intervalMs: number): void
```

**Cache invalidation:** After each sync (both initial and periodic), the scheduler calls `invalidateCache()` from `scanner.ts` to ensure the next `getIndex()` call produces a fresh index reflecting newly synced files.

**Integration points:**
- `src/server/index.ts` calls `await initSync()` at startup, then `startPeriodicSync()`
- `src/cli/index.ts` has a `preAction` hook that calls `initSync()` before any CLI command (except `serve`, which handles its own sync)
- `src/server/routes/system.ts` calls `runSync()` before `reindex()` on `POST /api/reindex`, and `restartPeriodicSync()` when sync interval is changed via `POST /api/settings/config`
- `src/server/routes/sync.ts` exposes manual sync via `POST /api/sync`

### `src/data/scanner.ts` — Project Discovery

#### How it works

1. Lists directories in `${PROJECTS_DIR}` (which is `DATA_DIR/projects/`, populated by sync)
2. For each project directory:
   - Finds `*.jsonl` files (sessions)
   - Reads first 20 lines of each for metadata (slug, model, git branch, summary)
   - Scans **all** assistant messages for token usage (input, output, cache read, cache create)
   - Estimates cost per session using `estimateCost()` from `pricing.ts`
   - Discovers sub-agents in `[sessionId]/subagents/agent-*.jsonl`
   - **Detects orphan session directories** — UUID-named directories with no matching `.jsonl` file that contain `tool-results/*.txt` or `subagents/*.jsonl`. These get synthetic `SessionRef` entries with summary previews.
   - Loads matching task files from `${TODOS_DIR}`
3. Sorts projects by last activity

#### Token Extraction (v0.2 change)

The scanner now processes **every line** of a session file, not just the first 20. While metadata (slug, model, branch, summary) is still extracted from the first 20 lines, token usage is accumulated from all assistant messages:

```typescript
// Token usage aggregation (extracted from ALL assistant messages)
const tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 };

for (let i = 0; i < lines.length; i++) {
  const obj = JSON.parse(lines[i]);

  // Metadata from first 20 lines only...

  // Token usage from ALL assistant messages
  if (obj.type === 'assistant' && obj.message?.usage) {
    const u = obj.message.usage;
    tokenUsage.inputTokens += u.input_tokens || 0;
    tokenUsage.outputTokens += u.output_tokens || 0;
    tokenUsage.cacheReadTokens += u.cache_read_input_tokens || 0;
    tokenUsage.cacheCreateTokens += u.cache_creation_input_tokens || 0;
  }
}

// Stored on SessionRef
ref.tokenUsage = tokenUsage;
ref.estimatedCostUsd = estimateCost(ref.model, tokenUsage);
```

This means `SessionRef` now carries `tokenUsage?: TokenUsage` and `estimatedCostUsd?: number`, making session-level cost data available without full parsing.

#### Caching

```typescript
let cachedIndex: ClarcIndex | null = null;

// Returns cached index or scans fresh
getIndex(): Promise<ClarcIndex>

// Forces a full re-scan
reindex(): Promise<ClarcIndex>
```

The index is cached in memory after first scan. It is automatically invalidated after each sync cycle. Can also be manually refreshed via `reindex()` (`POST /api/reindex`).

#### Error Handling

- Missing directories: Returns empty arrays
- Malformed JSONL: Skips bad lines, logs warnings
- Permission errors: Catches and warns, continues scanning

### `src/data/parser.ts` — Session Parsing

#### How it works

1. Reads entire `.jsonl` file (or, for tool-results-only sessions, reads `tool-results/*.txt` files from the session directory)
2. Processes each line:
   - Extracts `queue-operation` entries for sub-agent linking
   - Skips `file-history-snapshot`, `queue-operation`, `progress` types
   - Parses `user` and `assistant` messages
3. For assistant messages:
   - Separates `thinking` blocks from content
   - Extracts `tool_use` blocks as `ToolCall` objects
   - Accumulates token usage from `message.usage`
4. Estimates cost from accumulated tokens + model

#### Content Polymorphism

`message.content` can be:
- A **string** — normalized to `[{ type: 'text', text: content }]`
- An **array of ContentBlock** — processed as-is

#### Tool Call Pairing

```typescript
pairToolCalls(messages: Message[]): Message[]
```

1. Scans all messages for `tool_result` blocks (in user/tool messages)
2. Matches `tool_use_id` to corresponding `ToolCall` in assistant messages
3. Marks error results (`result.startsWith('Error:')`)

#### LRU Cache

```typescript
const sessionCache = new Map<string, { session: Session; parsedAt: number }>();
const MAX_CACHE_SIZE = 50;
```

- Parsed sessions are cached by sessionId
- When cache exceeds 50 entries, the oldest is evicted
- No TTL — entries persist until eviction or process restart

### `src/data/stats.ts` — Analytics

Reads the precomputed `stats-cache.json` (generated by Claude Code itself) and derives temporal analytics:

- **costByDay**: Estimated from `dailyModelTokens` (assumes 60/40 input/output split)
- **activityHeatmap**: Derived from `hourCounts`
- **dailyActivity, hourlyDistribution**: Temporal pattern data

**Important (v0.2):** `stats-cache.json` is only used for temporal patterns. All cost and token metrics are now computed exclusively from indexed session data in the analytics route. See [Analytics Route](#analytics) for details.

### `src/data/tasks.ts` — Task Parsing

Reads JSON files from `${TODOS_DIR}`. Filename format: `{sessionId}-agent-{agentId}.json`

---

## API Layer

### Server Setup (`src/server/index.ts`)

```typescript
import { initSync, startPeriodicSync } from '../data/sync-scheduler';

const app = new Hono();
app.use('/api/*', cors());          // CORS for Vite dev proxy
app.route('/api/projects', ...);    // Route mounting
app.route('/api/sync', syncRoute);  // Sync routes
app.use('/*', serveStatic(...));    // Static files (production)
app.get('/*', serveStatic(...));    // SPA fallback

// Run initial sync, then start periodic sync
await initSync();
startPeriodicSync();

export default { port: PORT, fetch: app.fetch };  // Bun serve
```

### Complete API Reference

#### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects with summary stats |
| GET | `/api/projects/:id` | Full project detail (sessions, agents, tasks) |
| GET | `/api/projects/:id/sessions` | Sessions for a project |

#### Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/bookmarks?ids=id1,id2,id3` | Bookmarked session summaries |
| GET | `/api/sessions/:id` | Full parsed session with all messages |
| GET | `/api/sessions/:id/messages?offset=&limit=` | Paginated messages |
| GET | `/api/sessions/agents/:projectId/:agentId` | Sub-agent session |

The bookmarks endpoint returns `{ sessions: [{ id, projectId, projectName, slug, model, messageCount, costUsd, startedAt }] }` for the given session IDs. This is used by the Dashboard to display bookmarked sessions.

#### Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=&project=&model=&after=&before=&limit=` | Full-text search |

**Query parameters:**
- `q` (required) — Search query, case-insensitive substring
- `project` — Filter by project ID or name
- `model` — Filter by model name
- `after` — ISO date, sessions modified after
- `before` — ISO date, sessions modified before
- `limit` — Max results (default 50)

Searches through message text blocks and thinking blocks.

#### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics` | Full analytics dashboard data |
| GET | `/api/analytics/model-usage` | Model usage breakdown (from session data) |
| GET | `/api/analytics/cost` | Cost by day and model (costs from session data) |
| GET | `/api/analytics/heatmap` | Activity heatmap data (from stats-cache) |

**Analytics cost source (v0.2):** The `GET /api/analytics` route computes cost and token metrics exclusively from indexed session data (`SessionRef.tokenUsage` and `SessionRef.estimatedCostUsd`). `stats-cache.json` is only used for temporal patterns (daily activity, hourly distribution, heatmap). This makes session-derived data the single source of truth for cost metrics, avoiding mismatches between what Claude Code tracks in its stats-cache and what clarc has indexed.

The response includes:
- `costByModel` — Per-model cost computed from session `estimatedCostUsd`
- `modelUsage` — Per-model token breakdown from session `tokenUsage`
- `topProjects` — Projects ranked by session count, with per-project cost
- `totalSessions`, `totalMessages` — From indexed data (not stats-cache)

#### Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/session/:id?thinking=&tools=` | Download as `.md` file |
| GET | `/api/export/session/:id/preview?thinking=&tools=` | Raw markdown text |

**Query parameters:**
- `thinking` — Include thinking blocks (default `true`, set to `false` to exclude)
- `tools` — Include tool calls (default `true`, set to `false` to exclude)

#### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | All tasks across all projects |
| GET | `/api/tasks/:sessionId` | Tasks for a specific session |

#### Sync

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sync/status` | Current sync state (file count, last sync time, errors) |
| POST | `/api/sync` | Trigger sync + reindex, returns sync status + index summary |

#### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check, index stats, sync info, directory paths |
| GET | `/api/settings/info` | Runtime info, config file contents, env override flags |
| POST | `/api/settings/config` | Validate and save clarc.json config |
| POST | `/api/reindex` | Sync (unless `?sync=false`) then re-scan data directory |
| GET | `/api/settings/detect-sources` | Auto-detect Windows Claude dirs on WSL |

**GET `/api/settings/info`** returns:
- `sourceDir`, `sourceDirs`, `dataDir`, `syncIntervalMs`, `port`, `version` — active runtime values
- `configFilePath` — path to `clarc.json`
- `configFile` — current JSON contents of `clarc.json` (the persisted overrides, including `sourceDirs`)
- `envOverrides` — `{ sourceDir, dataDir, port, syncIntervalMs }` booleans indicating which fields are locked by environment variables

**POST `/api/settings/config`** accepts a partial config object. Sending `null` for a field removes it (reverts to default). Returns `{ saved, restartRequired, config, errors, warnings }`. When `syncIntervalMs` is changed, it hot-reloads the sync timer via `restartPeriodicSync()`. Returns `restartRequired: true` when sourceDirs, dataDir, or port change. When `sourceDirs` is set, the legacy `sourceDir` field is automatically cleared.

**GET `/api/settings/detect-sources`** returns `{ detected, suggestions, isWSL }`. On WSL, scans `/mnt/c/Users/*/.claude/` for Windows-side Claude directories. `suggestions` filters out already-configured sources.

### Adding a New API Route

1. Create `src/server/routes/myroute.ts`:
   ```typescript
   import { Hono } from 'hono';
   const app = new Hono();
   app.get('/', async (c) => {
     return c.json({ hello: 'world' });
   });
   export default app;
   ```

2. Mount in `src/server/index.ts`:
   ```typescript
   import myRoute from './routes/myroute';
   app.route('/api/myroute', myRoute);
   ```

---

## Frontend Layer

### Entry Point

`index.html` (loads Inter + JetBrains Mono via Google Fonts) -> `src/ui/main.tsx` -> `<BrowserRouter>` -> `<App />` -> Routes

### Routing (`src/ui/App.tsx`)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Dashboard` | Gradient hero, stat cards, recharts AreaChart, project cards |
| `/projects/:id` | `ProjectDetail` | SessionTimeline with date grouping, clickable agents |
| `/sessions/:id` | `SessionDetail` | Glass header, ConversationTurn grouping, scroll nav |
| `/sessions/:id/preview` | `MarkdownPreview` | Glass toolbar, rendered markdown export |
| `/analytics` | `Analytics` | 6 recharts, heatmap, circular cache indicator |
| `/search` | `Search` | Glass search bar, staggered result cards |
| `/tasks` | `Tasks` | Colored column headers, pulsing blocked dots |
| `/help` | `Help` | In-app help and usage guide |
| `/settings` | `Settings` | Theme, collapse, thinking, editable data config, archived projects |

### Hooks

#### `useApi<T>(path: string, deps?: any[])`

```typescript
const { data, loading, error, refetch } = useApi<Project[]>('/projects');
```

- Fetches from `/api${path}` on mount and when deps change
- Returns `{ data: T | null, loading: boolean, error: string | null, refetch }`
- Handles errors gracefully

#### `useKeyboardShortcuts(setShowHelp)`

Registers global keyboard handlers:
- `/` — Navigate to `/search`, focus input
- `?` — Show help overlay
- `Escape` — Close context panel (priority), or close help overlay
- Ignores keypresses when focused in input/textarea fields

#### `useSettings()`

Manages user preferences stored in localStorage under `clarc-settings`:

```typescript
const [settings, updateSettings] = useSettings();
// settings: { theme, collapseThreshold, defaultShowThinking, archivedProjects, bookmarkedSessions }
// updateSettings({ theme: 'dark' })  // partial updates, persisted immediately
```

- **Theme**: Applies `data-theme` attribute on `<html>` element. `'system'` removes the attribute (falls back to media query), `'light'`/`'dark'` force the mode.
- **Collapse threshold**: Passed to `CollapsibleContent` via `ConversationTurn` → `MessageRenderer`. Set to `0` to disable.
- **Default show thinking**: Read by `SessionDetail` and `AgentDetail` for initial `showThinking` state.
- **archivedProjects**: `string[]` of project IDs. Used by `Sidebar` to filter projects and by `Settings` to show the Archived Projects management section.
- **bookmarkedSessions**: `string[]` of session IDs. Used by `Dashboard` to fetch and display bookmarked sessions, and by `SessionDetail`/`AgentDetail` to show the bookmark toggle star.

**Helper functions** (exported separately):
- `isProjectArchived(settings, projectId)` / `toggleProjectArchived(settings, update, projectId)` — archive state management
- `isSessionBookmarked(settings, sessionId)` / `toggleSessionBookmark(settings, update, sessionId)` — bookmark state management

#### `useSessionNavigation(projectId, currentSessionId)`

Enables `[` and `]` keyboard shortcuts to navigate between sessions within the same project:

```typescript
export function useSessionNavigation(projectId: string, currentSessionId: string) {
  // Fetches project sessions list
  // [ → previous session, ] → next session
  // Ignores input/textarea focus
}
```

Used by `SessionDetail` to allow sequential session browsing.

### Components

#### Shared Components (New in v0.2)

| Component | File | Description |
|-----------|------|-------------|
| `CollapsibleContent` | `CollapsibleContent.tsx` | Generic height-based collapse with gradient fade and sticky "Show less" pill |
| `Skeleton` | `Skeleton.tsx` | Shimmer loading placeholders using the `.skeleton` CSS class |
| `PageTransition` | `PageTransition.tsx` | Route-keyed `fadeInUp` animation wrapper for page content |
| `StatCard` | `StatCard.tsx` | Gradient-bordered stat cards for dashboard metrics |
| `ChartCard` | `ChartCard.tsx` | Recharts wrapper card with title and consistent styling |
| `EmptyState` | `EmptyState.tsx` | Empty state display with icon and message |
| `Badge` | `Badge.tsx` | Standardized pill badge for status, model, cost labels |
| `Icons` | `Icons.tsx` | ~35 inline SVG icon components (includes ArchiveIcon, StarIcon, StarFilledIcon, FolderIcon) |
| `Tooltip` | `Tooltip.tsx` | Pure CSS tooltip (no JavaScript positioning) |
| `ContextPanelProvider` | `ContextPanelProvider.tsx` | React context providing side panel open/close state |
| `ContextPanel` | `ContextPanel.tsx` | 480px slide-in panel for agents, tool details, previews |
| `SessionTimeline` | `SessionTimeline.tsx` | Vertical timeline with date-based grouping |
| `ConversationTurn` | `ConversationTurn.tsx` | Groups a user message + its assistant reply into a visual turn |
| `ScrollProgress` | `ScrollProgress.tsx` | Thin progress bar showing scroll position |
| `ScrollNav` | `ScrollNav.tsx` | Floating pill with jump-to-top and jump-to-bottom buttons |

#### Core Components

##### `Layout.tsx`

The app shell. Renders:
- Collapsible sidebar (280px)
- Main content area (`<Outlet />` from React Router)
- `ContextPanelProvider` wrapping the content
- `ContextPanel` slide-in side panel
- Keyboard shortcuts overlay
- Toggle button when sidebar is collapsed

##### `Sidebar.tsx`

- **Header**: "clarc" logo with `text-gradient` animation + sync button (refresh icon, spins while syncing, calls `POST /api/sync` and refetches projects) + collapse button
- **Filter**: Text input to filter projects (shows all projects including archived when filtering)
- **Navigation**: Dashboard, Analytics, Search, Tasks links with icons and active accent bar
- **Project list**: Sorted by activity, shows name, session count, message count, time ago; hover reveals chevron and archive button
- **Archive toggle**: When archived projects exist, shows "N archived" toggle in project header. Archived projects displayed at 50% opacity.
- **Bottom links**: Settings (gear icon) and Help & Guide (help circle icon) pinned at the bottom

##### `MessageRenderer.tsx`

The core message display component. Handles:
- **User messages**: Avatar circle, bubble card, cleans command tags, renders markdown in `CollapsibleContent`
- **Assistant messages**: Avatar circle, renders thinking blocks, text content (markdown in `CollapsibleContent`), tool calls with cost badges
- **Tool messages**: Skipped (results shown inline with assistant)
- **Meta messages**: Skipped

Props include `onToolClick` for opening tool details in the context panel and `collapseThreshold` for controlling auto-collapse height.

##### `ThinkingBlock.tsx`

Collapsible thinking content:
- Smooth `max-height` animation for expand/collapse
- SVG chevron rotation
- Gradient border styling
- Badge showing estimated token count (~4 chars/token)
- Purple/indigo themed background

##### `ToolCallBlock.tsx`

Collapsible tool call:
- Per-tool icons (different icon for Read, Write, Bash, Edit, etc.)
- Smart input display (shows filename for Read/Write/Edit, command for Bash, etc.)
- Green themed (or red with pulsing error dot for errors)
- JSON-formatted input
- Truncated result (5000 chars max)
- `onExpand` prop for opening details in the context panel

##### `CodeBlock.tsx`

Code display:
- macOS-style colored dots in the header
- Language indicator
- Copy button with animation feedback
- Horizontal scrollable `<pre>` block

##### `KeyboardShortcuts.tsx`

Keyboard shortcut help overlay:
- Backdrop blur effect
- `scaleIn` animation on open
- Physical key styling (3D key appearance)
- Lists all available shortcuts

### Page Designs (v0.2)

All pages now include skeleton loading states (using `Skeleton` components) while data is being fetched.

- **Dashboard**: Gradient hero section, `StatCard` grid, bookmarked sessions section, `ChartCard` with Recharts `AreaChart`, project listing
- **ProjectDetail**: `SessionTimeline` with date grouping, clickable agent badges that open in `ContextPanel`
- **SessionDetail**: Glass header with session metadata, `ConversationTurn` grouping, `ScrollProgress` bar, `ScrollNav` floating pill, `[` / `]` session navigation
- **Analytics**: 6 Recharts visualizations (cost bar chart, cost area chart, token area chart, hourly bar chart), activity heatmap grid, circular cache hit indicator
- **Search**: Glass search bar, staggered result card animations
- **Tasks**: Colored column headers per status, pulsing dot for blocked tasks
- **MarkdownPreview**: Glass toolbar, toggle switches for thinking/tools inclusion
- **Settings**: Theme toggle (segmented control), collapse threshold slider, thinking default toggle, editable data config (clarc.json), archived projects management
- **Help**: Table of contents, feature sections, keyboard shortcuts, cost table

### Adding a New Page

1. Create `src/ui/pages/MyPage.tsx`:
   ```tsx
   import { useApi } from '../hooks/useApi';
   import { PageTransition } from '../components/PageTransition';
   import { Skeleton } from '../components/Skeleton';

   export default function MyPage() {
     const { data, loading } = useApi<MyData>('/my-endpoint');

     if (loading) return <Skeleton variant="page" />;

     return (
       <PageTransition>
         <div>{/* render data */}</div>
       </PageTransition>
     );
   }
   ```

2. Add route in `src/ui/App.tsx`:
   ```tsx
   import MyPage from './pages/MyPage';
   // Inside <Route element={<Layout />}>:
   <Route path="/my-page" element={<MyPage />} />
   ```

3. Optionally add to Sidebar navigation in `Sidebar.tsx` (include an icon from `Icons.tsx`).

---

## CLI Layer

### Architecture

```
src/cli/main.ts    # Entry point — detects CLI vs server mode
src/cli/index.ts   # Command definitions using Commander + preAction sync
```

`main.ts` checks if `process.argv` contains a known CLI command (`status`, `projects`, `search`, `export`). If yes, runs the CLI. Otherwise, imports and starts the server.

### Sync Integration

The CLI has a `preAction` hook that syncs data before any command runs:

```typescript
program.hook('preAction', async (thisCommand) => {
  // Skip sync for the serve command (server handles its own sync)
  if (thisCommand.name() === 'serve') return;
  await initSync();
});
```

This ensures the CLI always reads fresh data from `~/.claude/` even when run standalone.

### Commands

```bash
# Start the web server (default command)
clarc
clarc serve
clarc serve --port 4000

# Show history stats
clarc status

# List projects
clarc projects

# Search across sessions
clarc search "query"
clarc search "query" --json
clarc search "query" --limit 10

# Export session as markdown
clarc export <session-id>
clarc export <session-id> -o output.md
```

### Testing CLI in Docker

```bash
docker compose exec clarc bun run src/cli/main.ts status
docker compose exec clarc bun run src/cli/main.ts projects
docker compose exec clarc bun run src/cli/main.ts search "CLAUDE.md"
```

### Adding a New CLI Command

In `src/cli/index.ts`:

```typescript
program
  .command('mycommand <arg>')
  .description('Does something useful')
  .option('-f, --flag', 'A flag')
  .action(async (arg, opts) => {
    const index = await getIndex();
    // ... do work ...
    console.log(result);
  });
```

The `preAction` hook will automatically sync before the command runs.

---

## Styling & Theming

### Design System Overview

The design system is defined entirely in `src/ui/styles/globals.css` using CSS custom properties, keyframe animations, and utility classes. It provides automatic dark mode via `@media (prefers-color-scheme: dark)`.

### Typography

- **UI text**: Inter (loaded via Google Fonts in `index.html`)
- **Code/monospace**: JetBrains Mono (loaded via Google Fonts in `index.html`)
- Tight letter-spacing on headings (`-0.025em`), subtle on body (`-0.01em`)

### CSS Custom Properties (~50 tokens)

#### Colors

```css
/* Base */
--color-bg              /* Page background */
--color-surface         /* Card/panel background */
--color-surface-2       /* Nested surface */
--color-surface-3       /* Deeper nested surface */
--color-surface-glass   /* Semi-transparent for glass effect */
--color-surface-elevated /* Elevated surface */
--color-border          /* Borders */
--color-text            /* Primary text */
--color-text-muted      /* Secondary text */

/* Primary */
--color-primary         /* Indigo accent */
--color-primary-hover   /* Accent hover */
--color-primary-subtle  /* Very light accent background */

/* Accents */
--color-accent-amber    /* Amber */
--color-accent-emerald  /* Emerald */
--color-accent-rose     /* Rose */
--color-accent-cyan     /* Cyan */
--color-accent-violet   /* Violet */

/* Semantic */
--color-thinking        /* Thinking block background */
--color-thinking-border /* Thinking block border */
--color-tool            /* Tool call background */
--color-tool-border     /* Tool call border */
--color-error           /* Error background */
--color-error-border    /* Error border */
--color-user-bubble     /* User message accent */
```

#### Gradients

```css
--gradient-primary      /* Primary button gradient */
--gradient-hero         /* Hero section (indigo → cyan → violet) */
--gradient-card-hover   /* Subtle overlay on card hover */
--gradient-surface      /* Surface to bg fade */
--gradient-stat-1..4    /* Four stat card gradients */
--gradient-shimmer      /* Skeleton loading shimmer */
```

#### Shadows, Animation, Radii, Blur

```css
/* Shadows */
--shadow-sm / --shadow-md / --shadow-lg / --shadow-xl
--shadow-glow / --shadow-glow-hover   /* Indigo glow */
--shadow-inset

/* Animation timing */
--ease-out-expo / --ease-out-back / --ease-spring
--duration-fast (150ms) / --duration-base (250ms)
--duration-slow (400ms) / --duration-enter (300ms)

/* Border radius */
--radius-sm (6px) / --radius-md (10px) / --radius-lg (14px) / --radius-xl (20px)

/* Backdrop blur */
--blur-sm (8px) / --blur-md (16px) / --blur-lg (24px)
```

### Dark Mode & Theming

Dark mode is supported via two mechanisms:

1. **System preference** — `@media (prefers-color-scheme: dark)` applies dark tokens when the OS is in dark mode. This is excluded when `data-theme="light"` is set: `:root:not([data-theme="light"])`.
2. **Manual override** — `[data-theme="dark"]` on the `<html>` element forces dark tokens regardless of OS setting.

The `useSettings` hook manages the theme. Setting theme to `'system'` removes the `data-theme` attribute (falling back to the media query). Setting `'light'` or `'dark'` applies the corresponding attribute.

**CSS structure:**
```css
:root { /* light tokens */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark tokens */ } }
:root[data-theme="dark"] { /* dark tokens (forced) */ }
```

### Keyframe Animations (15)

| Animation | Effect |
|-----------|--------|
| `fadeIn` | Opacity 0 to 1 |
| `fadeInUp` | Fade in + slide up 12px |
| `fadeInDown` | Fade in + slide down 8px |
| `slideInLeft` | Fade in + slide from left 16px |
| `slideInRight` | Fade in + slide from right 16px |
| `scaleIn` | Fade in + scale from 0.95 |
| `shimmer` | Background position sweep (for skeleton loading) |
| `pulse-subtle` | Opacity pulse between 1.0 and 0.6 |
| `spin` | 360-degree rotation |
| `float` | Gentle vertical bob (4px) |
| `gradient-shift` | Background position cycle (for animated gradients) |
| `backdrop-enter` | Opacity + blur-in for overlays |
| `count-up` | Fade in + slide up 8px (for number reveals) |
| `slidePanel` | Translate from right edge (for context panel) |

### Utility Classes

| Class | Purpose |
|-------|---------|
| `.glass` | Frosted glass: semi-transparent background + backdrop blur + border |
| `.card` | Standard card: surface bg, border, rounded corners, hover lift |
| `.card-glow` | Card with gradient overlay on hover |
| `.btn-primary` | Gradient primary button with glow hover |
| `.btn-ghost` | Transparent button with border, hover fills |
| `.text-gradient` | Animated gradient text (hero → clip) |
| `.skeleton` | Shimmer loading placeholder animation |
| `.stagger-children` | Auto-stagger `fadeInUp` on child elements (50ms intervals, up to 8 children) |
| `.animate-fadeIn` | Apply fadeIn animation |
| `.animate-fadeInUp` | Apply fadeInUp animation |
| `.animate-fadeInDown` | Apply fadeInDown animation |
| `.animate-slideInLeft` | Apply slideInLeft animation |
| `.animate-slideInRight` | Apply slideInRight animation |
| `.animate-scaleIn` | Apply scaleIn animation |
| `.animate-number` | Apply count-up animation |
| `.focus-ring` | Visible focus outline on `:focus-visible` |
| `.collapsible-content` | Max-height transition for expand/collapse (uses `data-open` attribute) |
| `.chevron-icon` | Rotation transition for chevrons (uses `data-open` attribute) |

### Usage in Components

Components use a combination of:
1. **CSS custom properties** (via inline styles) for theme-aware colors
2. **Tailwind utility classes** for layout (flex, grid, padding, margin, gap)
3. **Design system utility classes** (`.glass`, `.card`, `.btn-primary`, etc.) for reusable patterns
4. **CSS animation classes** (`.animate-fadeInUp`, `.stagger-children`) for motion

```tsx
<div className="card card-glow" style={{ padding: '24px' }}>
  <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Title</h2>
  <p style={{ color: 'var(--color-text-muted)' }}>Description</p>
  <button className="btn-primary">Action</button>
</div>
```

---

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `/` | Global | Navigate to Search page, focus input |
| `?` | Global | Toggle keyboard shortcuts overlay |
| `Escape` | Context panel open | Close context panel |
| `Escape` | Shortcuts overlay open | Close shortcuts overlay |
| `[` | Session detail page | Navigate to previous session in project |
| `]` | Session detail page | Navigate to next session in project |

Shortcuts are ignored when focus is in an `<input>` or `<textarea>` element. `Escape` prioritizes closing the context panel over the shortcuts overlay.

---

## Data Format Reference

See `DATAFORMAT.md` for the complete reference. Key points:

### Session JSONL

Each `.jsonl` file in `projects/[encoded-path]/` contains one JSON object per line.

**Message types**: `user`, `assistant`, `file-history-snapshot`, `queue-operation`, `progress`

**Content block types**: `text`, `thinking`, `tool_use`, `tool_result`

### Project Path Encoding

Project directories encode the filesystem path: `/mnt/e/my_project` -> `-mnt-e-my-project`

### Sub-Agent Discovery

1. Parent session has `queue-operation` message with `operation: "enqueue"` and `content.task_id`
2. Sub-agent file: `[sessionId]/subagents/agent-[task_id].jsonl`
3. Sub-agent messages have `isSidechain: true` and `agentId` field

---

## Adding New Features

### Feature: New Data Source

1. Add parser in `src/data/mynewdata.ts`
2. Add types in `src/shared/types.ts`
3. If the data lives in `~/.claude/`, add it to the sync allowlist in `sync.ts` (`SYNC_TARGETS`)
4. Integrate into `scanner.ts` (load during `reindex()`)
5. Create API route in `src/server/routes/`
6. Mount route in `src/server/index.ts`
7. Create UI page in `src/ui/pages/` (use `PageTransition`, `Skeleton` for loading)
8. Add route in `App.tsx`

### Feature: New Chart

1. Create a `ChartCard` wrapper or use the existing `ChartCard` component
2. Use `recharts` library (already installed and fully wired)
3. Import and render in the relevant page (Dashboard or Analytics)
4. Use design system tokens for colors (`--color-primary`, `--color-accent-*`, etc.)

### Feature: New Shared Component

1. Create `src/ui/components/MyComponent.tsx`
2. Use design system utility classes (`.card`, `.glass`, `.btn-primary`, etc.)
3. Use CSS custom properties for all colors
4. Add icon to `Icons.tsx` if the component needs one
5. Import and use in pages

### Feature: New Search Type

1. Add search logic in `src/data/` (create new file)
2. Expose via new API endpoint or extend existing `/api/search`
3. Add UI tab in `Search.tsx`

---

## Building for Production

### Compile the Binary

```bash
make build
# → Runs inside Docker:
#   1. vite build → dist/ (client assets)
#   2. bun build --compile src/cli/main.ts --outfile clarc
# → Output: ./dist-binary/clarc
```

### Install and Run

```bash
cp dist-binary/clarc /usr/local/bin/clarc
clarc              # Starts web server on port 3838 (syncs ~/.claude → ~/.config/clarc/data first)
clarc status       # CLI: show stats (syncs first)
clarc search "bug" # CLI: search sessions (syncs first)
```

The binary reads `~/.claude` as the source directory and syncs to `./data/` next to the binary. Settings can be configured via `./clarc.json` next to the binary or via the Settings page in the web UI. No Docker needed.

### Build the Desktop App (Tauri)

#### Via Docker (Linux only)

```bash
make tauri-build
# → Outputs: dist-tauri/deb/clarc_0.2.0_amd64.deb
#            dist-tauri/rpm/clarc-0.2.0-1.x86_64.rpm
```

#### On Host (any platform, requires Bun + Rust)

```bash
make tauri-build-host
# → Outputs: src-tauri/target/release/bundle/ (platform-specific installer)
```

#### Via GitHub Actions CI (all platforms)

Push a version tag to trigger cross-platform builds:

```bash
git tag v0.2.0
git push --tags
# → Builds for Linux x64, macOS ARM, macOS Intel, Windows x64
# → Creates a draft GitHub Release with all installers
```

The CI workflow (`.github/workflows/release.yml`) builds all 4 targets in parallel using `tauri-apps/tauri-action`.

### Tauri Architecture

```
Tauri App Shell (Rust)
├── System WebView (loads splash screen, then navigates to sidecar URL)
│   └── fetch('/api/...') → HTTP localhost:PORT
└── Bun Sidecar (clarc-core)
    ├── Hono API server (serves frontend + API)
    ├── Data sync engine
    └── Session parser
```

- The Rust shell finds a free port via `portpicker`, spawns `clarc-core --port N` with `CLARC_APP_DATA` env var
- The sidecar prints `__CLARC_READY__ http://localhost:PORT` on stdout when ready
- The Rust code watches for this signal and navigates the webview to the sidecar URL
- System tray with Show/Quit menu; sidecar is killed on window close or quit
- In dev mode (`make tauri-dev`), the webview loads from Vite HMR at `localhost:5173`

---

## Troubleshooting

### Vite crashes with EINVAL on WSL2

The Vite file watcher can fail on cross-filesystem mounts. The config includes `usePolling: true` to handle this. If you still see crashes:

```bash
# Restart the container
make stop && make dev
```

### Port already in use

```bash
# Check what's using the port
docker compose down
# Or kill stale processes
docker compose down -v
```

### No projects / empty data

Verify the Claude data mount and sync:
```bash
make shell
ls /home/claude-data/projects/    # Source (read-only mount)
ls /home/clarc-config/data/projects/  # Synced working copy
```

If the synced directory is empty, trigger a manual sync:
```bash
curl -X POST http://localhost:3838/api/sync
```

If the source is empty, check that `~/.claude/projects/` exists on your host.

### Sync issues

Check sync status:
```bash
curl http://localhost:3838/api/sync/status
```

This returns the last sync time, file count, and any errors. If errors persist, check file permissions on `~/.config/clarc/`.

### API returns stale data

Trigger a sync + re-index:
```bash
curl -X POST http://localhost:3838/api/reindex
```

Or trigger sync only (without reindex):
```bash
curl -X POST http://localhost:3838/api/sync
```

### Container logs

```bash
make logs
# or
docker compose logs -f clarc
```

### Dependency issues

```bash
# Rebuild container from scratch
make clean
make dev
```
