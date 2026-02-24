# clarc Developer Guide

A comprehensive guide for developers working on clarc — the Claude Archive tool.

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
12. [Data Format Reference](#data-format-reference)
13. [Adding New Features](#adding-new-features)
14. [Building for Production](#building-for-production)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

clarc is a full-stack TypeScript application with four layers:

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
     +--------+---------+          +-----------------+
              |
     +--------v--------+
     |  ~/.claude/      |
     |  (read-only)     |
     +-----------------+
```

**Key principle:** clarc **never modifies** user data in `~/.claude/`. All access is read-only.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Bun 1.x | Fast JavaScript runtime, single-binary compilation |
| Backend | Hono 4.x | Lightweight HTTP framework |
| Frontend | React 19, React Router 7 | SPA with client-side routing |
| Styling | Tailwind CSS 4.1 | Utility-first CSS via Vite plugin |
| Markdown | react-markdown, remark-gfm | Renders markdown content |
| Charts | Recharts 2.x | Data visualization (available, not yet fully wired) |
| CLI | Commander 13 | Command-line interface |
| Build | Vite 6.x | Frontend bundling and HMR |
| Container | Docker + Docker Compose | Isolated development environment |

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
#   - ~/.claude/ mounted read-only at /home/claude-data inside the container

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

### Golden Rule

**Never run `bun install`, `bun dev`, or any build commands directly on the host.** Everything runs inside Docker. Edit files on the host; run commands through Docker.

---

## Docker Development Environment

### Container Architecture

The `docker-compose.yml` defines two services:

#### `clarc` (main dev container)

- **Ports**: 3838 (API), 5173 (Vite)
- **Volumes**:
  - `.:/app` — Source code (read-write, live editing)
  - `/app/node_modules` — Isolated deps (prevents host/container conflicts)
  - `${HOME}/.claude:/home/claude-data:ro` — Claude data (READ-ONLY)
  - `${HOME}/.config/clarc:/home/clarc-config` — clarc config
- **Environment**:
  - `CLARC_CLAUDE_DIR=/home/claude-data`
  - `CLARC_CONFIG_DIR=/home/clarc-config`
  - `CLARC_PORT=3838`
  - `HOST=0.0.0.0`

#### `build` (one-shot binary compilation)

- Activated with `make build` or `docker compose run --rm build`
- Runs `vite build` + `bun build --compile`
- Outputs binary to `./dist-binary/clarc` on the host

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
├── Dockerfile                    # Container image definition
├── docker-compose.yml            # Service orchestration
├── Makefile                      # Convenience commands
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build and dev config
├── index.html                    # HTML entry point
├── .dockerignore                 # Docker build exclusions
├── .gitignore                    # Git exclusions
├── DATAFORMAT.md                 # ~/.claude/ data format documentation
│
├── src/
│   ├── shared/                   # Shared across all layers
│   │   ├── paths.ts              # Centralized path configuration
│   │   ├── types.ts              # All TypeScript interfaces
│   │   └── pricing.ts            # Model pricing & cost estimation
│   │
│   ├── data/                     # Data access layer
│   │   ├── scanner.ts            # Project/session filesystem discovery
│   │   ├── parser.ts             # Session JSONL parsing + LRU cache
│   │   ├── tasks.ts              # Todo file parsing
│   │   └── stats.ts              # Analytics computation from stats-cache
│   │
│   ├── server/                   # HTTP API
│   │   ├── index.ts              # Hono app, middleware, static serving
│   │   └── routes/               # Route handlers
│   │       ├── projects.ts       # GET /api/projects[/:id]
│   │       ├── sessions.ts       # GET /api/sessions/:id, /api/sessions/agents/...
│   │       ├── tasks.ts          # GET /api/tasks[/:sessionId]
│   │       ├── analytics.ts      # GET /api/analytics[/model-usage|cost|heatmap]
│   │       ├── search.ts         # GET /api/search?q=...
│   │       ├── export.ts         # GET /api/export/session/:id[/preview]
│   │       └── system.ts         # GET /api/status, POST /api/reindex
│   │
│   ├── cli/                      # Command-line interface
│   │   ├── main.ts               # Entry point (CLI vs server mode detection)
│   │   └── index.ts              # Command definitions
│   │
│   └── ui/                       # React frontend
│       ├── main.tsx              # React DOM mount
│       ├── App.tsx               # Route definitions
│       ├── styles/
│       │   └── globals.css       # Tailwind imports, CSS variables, theme
│       ├── hooks/
│       │   ├── useApi.ts         # Fetch wrapper with loading/error states
│       │   └── useKeyboard.ts    # Keyboard shortcut handler
│       ├── components/
│       │   ├── Layout.tsx        # App shell (sidebar + main + overlays)
│       │   ├── Sidebar.tsx       # Project navigation
│       │   ├── MessageRenderer.tsx # Core message display
│       │   ├── ThinkingBlock.tsx  # Collapsible thinking block
│       │   ├── ToolCallBlock.tsx  # Collapsible tool call display
│       │   ├── CodeBlock.tsx      # Code block with copy button
│       │   └── KeyboardShortcuts.tsx # Shortcut help overlay
│       └── pages/
│           ├── Dashboard.tsx      # Home: stats, charts, project cards
│           ├── ProjectDetail.tsx  # Session timeline with sub-agents
│           ├── SessionDetail.tsx  # Full conversation view
│           ├── Analytics.tsx      # Cost, tokens, activity analysis
│           ├── Search.tsx         # Full-text search
│           ├── Tasks.tsx          # Kanban task board
│           └── MarkdownPreview.tsx # Rendered markdown export
│
└── dist-binary/                  # Compiled binary output
    └── clarc                     # Single standalone executable
```

---

## Shared Layer

### `src/shared/paths.ts` — Path Configuration

**Critical:** All file system paths in the entire application flow through this module. Never hardcode `~/.claude` or `/home/claude-data` anywhere else.

```typescript
import { homedir } from 'os';
import { join } from 'path';

export const CLAUDE_DIR = process.env.CLARC_CLAUDE_DIR || join(homedir(), '.claude');
export const CONFIG_DIR = process.env.CLARC_CONFIG_DIR || join(homedir(), '.config', 'clarc');
export const PORT = parseInt(process.env.CLARC_PORT || '3838', 10);

// All derived paths
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');
export const TODOS_DIR    = join(CLAUDE_DIR, 'todos');
export const PLANS_DIR    = join(CLAUDE_DIR, 'plans');
export const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');
export const STATS_FILE   = join(CLAUDE_DIR, 'stats-cache.json');
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
```

This means:
- **In Docker**: `CLARC_CLAUDE_DIR=/home/claude-data` reads the mounted volume
- **Running the binary on host**: Falls back to `~/.claude` automatically

### `src/shared/types.ts` — Type Definitions

Contains all TypeScript interfaces shared across layers. Key types:

| Type | Used By | Description |
|------|---------|-------------|
| `ClarcIndex` | Scanner, API | Top-level index of all projects |
| `Project` | Scanner, API | Project with sessions, agents, tasks |
| `SessionRef` | Scanner | Lightweight session reference (no full parse) |
| `Session` | Parser, API | Fully parsed session with messages |
| `Message` | Parser, UI | Individual message with content blocks |
| `ThinkingBlock` | Parser, UI | Extended thinking content |
| `ToolCall` | Parser, UI | Tool invocation + result |
| `ContentBlock` | Parser, UI | Typed content (text, tool_use, tool_result) |
| `GlobalStats` | Stats | From `stats-cache.json` |
| `Analytics` | Stats, API | Computed analytics dashboard data |
| `SearchResult` | Search, API | Search hit with snippet |
| `TaskList` / `Task` | Tasks, API | Todo items |

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

The data layer reads `~/.claude/` and produces typed structures for the API and CLI. It **never modifies** any files.

### `src/data/scanner.ts` — Project Discovery

#### How it works

1. Lists directories in `${CLAUDE_DIR}/projects/`
2. For each project directory:
   - Finds `*.jsonl` files (sessions)
   - Reads first 20 lines of each for metadata (slug, model, git branch, summary)
   - Discovers sub-agents in `[sessionId]/subagents/agent-*.jsonl`
   - Loads matching task files from `${CLAUDE_DIR}/todos/`
3. Sorts projects by last activity

#### Caching

```typescript
let cachedIndex: ClarcIndex | null = null;

// Returns cached index or scans fresh
getIndex(): Promise<ClarcIndex>

// Forces a full re-scan
reindex(): Promise<ClarcIndex>
```

The index is cached in memory after first scan. Call `reindex()` (via `POST /api/reindex`) to refresh.

#### Error Handling

- Missing directories: Returns empty arrays
- Malformed JSONL: Skips bad lines, logs warnings
- Permission errors: Catches and warns, continues scanning

### `src/data/parser.ts` — Session Parsing

#### How it works

1. Reads entire `.jsonl` file
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
- A **string** → normalized to `[{ type: 'text', text: content }]`
- An **array of ContentBlock** → processed as-is

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

Reads the precomputed `stats-cache.json` (generated by Claude Code itself) and derives additional analytics:

- **costByModel**: Calculated from token counts × pricing
- **costByDay**: Estimated from `dailyModelTokens` (assumes 60/40 input/output split)
- **activityHeatmap**: Derived from `hourCounts`

### `src/data/tasks.ts` — Task Parsing

Reads JSON files from `${CLAUDE_DIR}/todos/`. Filename format: `{sessionId}-agent-{agentId}.json`

---

## API Layer

### Server Setup (`src/server/index.ts`)

```typescript
const app = new Hono();
app.use('/api/*', cors());          // CORS for Vite dev proxy
app.route('/api/projects', ...);    // Route mounting
app.use('/*', serveStatic(...));    // Static files (production)
app.get('/*', serveStatic(...));    // SPA fallback

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
| GET | `/api/sessions/:id` | Full parsed session with all messages |
| GET | `/api/sessions/:id/messages?offset=&limit=` | Paginated messages |
| GET | `/api/sessions/agents/:projectId/:agentId` | Sub-agent session |

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
| GET | `/api/analytics/model-usage` | Model usage breakdown |
| GET | `/api/analytics/cost` | Cost by day and model |
| GET | `/api/analytics/heatmap` | Activity heatmap data |

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

#### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check, index stats |
| POST | `/api/reindex` | Trigger full re-scan of `~/.claude` |

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

`index.html` → `src/ui/main.tsx` → `<BrowserRouter>` → `<App />` → Routes

### Routing (`src/ui/App.tsx`)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Dashboard` | Stats, charts, project cards |
| `/projects/:id` | `ProjectDetail` | Session timeline with agents |
| `/sessions/:id` | `SessionDetail` | Full conversation view |
| `/sessions/:id/preview` | `MarkdownPreview` | Rendered markdown export |
| `/analytics` | `Analytics` | Cost, tokens, activity analysis |
| `/search` | `Search` | Full-text search |
| `/tasks` | `Tasks` | Kanban task board |

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
- `/` → Navigate to `/search`, focus input
- `?` → Show help overlay
- `Escape` → Close help overlay
- Ignores keypresses when focused in input/textarea fields

### Components

#### `Layout.tsx`

The app shell. Renders:
- Collapsible sidebar (280px)
- Main content area (`<Outlet />` from React Router)
- Keyboard shortcuts overlay
- Toggle button when sidebar is collapsed

#### `Sidebar.tsx`

- **Header**: "clarc" logo link + collapse button
- **Filter**: Text input to filter projects
- **Navigation**: Dashboard, Analytics, Search, Tasks links with active highlighting
- **Project list**: Sorted by activity, shows name, session count, message count, time ago

#### `MessageRenderer.tsx`

The core message display component. Handles:
- **User messages**: Cleans command tags (`<command-message>`, `<command-name>`), renders markdown
- **Assistant messages**: Renders thinking blocks, text content (markdown), tool calls
- **Tool messages**: Skipped (results shown inline with assistant)
- **Meta messages**: Skipped

Shows model badge, cost, and timestamp for assistant messages.

#### `ThinkingBlock.tsx`

Collapsible thinking content:
- Toggle button with token estimate (~4 chars/token)
- Purple/indigo themed background
- Monospace text preserving whitespace

#### `ToolCallBlock.tsx`

Collapsible tool call:
- Smart input display (shows filename for Read/Write/Edit, command for Bash, etc.)
- Green themed (or red for errors)
- JSON-formatted input
- Truncated result (5000 chars max)

#### `CodeBlock.tsx`

Code display:
- Language indicator
- Copy button (appears on hover)
- Horizontal scrollable `<pre>` block

### Adding a New Page

1. Create `src/ui/pages/MyPage.tsx`:
   ```tsx
   import { useApi } from '../hooks/useApi';

   export default function MyPage() {
     const { data } = useApi<MyData>('/my-endpoint');
     return <div>{/* render data */}</div>;
   }
   ```

2. Add route in `src/ui/App.tsx`:
   ```tsx
   import MyPage from './pages/MyPage';
   // Inside <Route element={<Layout />}>:
   <Route path="/my-page" element={<MyPage />} />
   ```

3. Optionally add to Sidebar navigation in `Sidebar.tsx`.

---

## CLI Layer

### Architecture

```
src/cli/main.ts    # Entry point — detects CLI vs server mode
src/cli/index.ts   # Command definitions using Commander
```

`main.ts` checks if `process.argv` contains a known CLI command (`status`, `projects`, `search`, `export`). If yes, runs the CLI. Otherwise, imports and starts the server.

### Commands

```bash
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

---

## Styling & Theming

### CSS Custom Properties

All colors are defined as CSS custom properties in `src/ui/styles/globals.css`, with automatic dark mode via `@media (prefers-color-scheme: dark)`.

#### Light Mode

```css
--color-bg: #ffffff                  /* Page background */
--color-surface: #f8fafc             /* Card/panel background */
--color-surface-2: #f1f5f9           /* Nested surface */
--color-border: #e2e8f0              /* Borders */
--color-text: #0f172a                /* Primary text */
--color-text-muted: #64748b          /* Secondary text */
--color-primary: #6366f1             /* Indigo accent */
--color-primary-hover: #4f46e5       /* Accent hover */
--color-thinking: #ede9fe            /* Thinking block bg */
--color-thinking-border: #c4b5fd     /* Thinking block border */
--color-tool: #f0fdf4                /* Tool call bg */
--color-tool-border: #86efac         /* Tool call border */
--color-error: #fef2f2               /* Error bg */
--color-error-border: #fca5a5        /* Error border */
--color-user-bubble: #eff6ff         /* User message accent */
```

#### Dark Mode

```css
--color-bg: #0f172a
--color-surface: #1e293b
--color-surface-2: #334155
--color-border: #475569
--color-text: #f1f5f9
--color-text-muted: #94a3b8
--color-primary: #818cf8
--color-thinking: #1e1b4b
--color-tool: #052e16
--color-error: #450a0a
--color-user-bubble: #172554
```

### Usage in Components

Always use inline styles with CSS variables for theme-aware colors:

```tsx
<div style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
  <span style={{ color: 'var(--color-text-muted)' }}>Secondary text</span>
</div>
```

Tailwind utility classes are used for layout (flex, grid, padding, margin, etc.) but colors use CSS variables for theme support.

---

## Data Format Reference

See `DATAFORMAT.md` for the complete reference. Key points:

### Session JSONL

Each `.jsonl` file in `projects/[encoded-path]/` contains one JSON object per line.

**Message types**: `user`, `assistant`, `file-history-snapshot`, `queue-operation`, `progress`

**Content block types**: `text`, `thinking`, `tool_use`, `tool_result`

### Project Path Encoding

Project directories encode the filesystem path: `/mnt/e/my_project` → `-mnt-e-my-project`

### Sub-Agent Discovery

1. Parent session has `queue-operation` message with `operation: "enqueue"` and `content.task_id`
2. Sub-agent file: `[sessionId]/subagents/agent-[task_id].jsonl`
3. Sub-agent messages have `isSidechain: true` and `agentId` field

---

## Adding New Features

### Feature: New Data Source

1. Add parser in `src/data/mynewdata.ts`
2. Add types in `src/shared/types.ts`
3. Integrate into `scanner.ts` (load during `reindex()`)
4. Create API route in `src/server/routes/`
5. Mount route in `src/server/index.ts`
6. Create UI page in `src/ui/pages/`
7. Add route in `App.tsx`

### Feature: New Chart

1. Create component in `src/ui/components/charts/MyChart.tsx`
2. Use `recharts` library (already installed)
3. Import and render in the relevant page (Dashboard or Analytics)

### Feature: New Search Type

1. Add search logic in `src/search/` (create new file)
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
clarc              # Starts web server on port 3838
clarc status       # CLI: show stats
clarc search "bug" # CLI: search sessions
```

The binary reads `~/.claude` directly (no Docker needed).

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

Verify the Claude data mount:
```bash
make shell
ls /home/claude-data/projects/
```

If empty, check that `~/.claude/projects/` exists on your host.

### API returns stale data

Trigger a re-index:
```bash
curl -X POST http://localhost:3838/api/reindex
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
