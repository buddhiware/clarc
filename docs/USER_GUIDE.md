# clarc User Guide

**clarc** (Claude Archive) is a local tool that reads your Claude Code session history from `~/.claude/` and presents it as a browsable web interface with search, analytics, markdown export, and sub-agent visualization.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Web Interface](#web-interface)
   - [Dashboard](#dashboard)
   - [Projects](#projects)
   - [Session Detail](#session-detail)
   - [Analytics](#analytics)
   - [Search](#search)
   - [Tasks](#tasks)
   - [Markdown Preview & Export](#markdown-preview--export)
4. [Command-Line Interface](#command-line-interface)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Dark Mode](#dark-mode)
7. [Configuration](#configuration)
8. [How It Works](#how-it-works)
9. [FAQ](#faq)

---

## Installation

### Option A: Run with Docker (recommended for development)

Requires: Docker and Docker Compose.

```bash
cd ClArc
make dev
# Open http://localhost:5173
```

### Option B: Build and install the standalone binary

Requires: Docker (for the build step only).

```bash
cd ClArc
make build
# Binary is at ./dist-binary/clarc

# Install it
cp dist-binary/clarc /usr/local/bin/clarc

# Run it
clarc
# Opens web UI on http://localhost:3838
```

### Option C: Run directly with Bun (no Docker)

Requires: [Bun](https://bun.sh) installed on your system.

```bash
cd ClArc
bun install
bun run dev
# Open http://localhost:5173
```

---

## Quick Start

1. **Start clarc** using any method above
2. **Open your browser** to the URL shown in the terminal
3. You'll see the **Dashboard** with a summary of your Claude Code history
4. Click a **project** in the sidebar to see its sessions
5. Click a **session** to read the full conversation

clarc reads your `~/.claude/` directory and discovers all projects, sessions, sub-agents, and tasks automatically. It never modifies your data.

---

## Web Interface

### Dashboard

The home page shows an overview of your entire Claude Code history:

- **Hero Stats** — Total projects, sessions, messages, and estimated cost
- **Model Usage Table** — Token counts and cost breakdown per model (Opus, Sonnet, Haiku)
- **Daily Activity Chart** — Bar chart showing messages per day
- **Project Cards** — Quick links to each project with session and message counts

### Projects

#### Sidebar

The left sidebar is always visible and shows:

- **Filter** — Type to filter projects by name
- **Navigation links** — Dashboard, Analytics, Search, Tasks
- **Project list** — All projects sorted by last activity, showing:
  - Project name
  - Session count and message count
  - Relative time since last activity (e.g., "2h ago")

Click a project to open its detail view.

#### Project Detail

Shows all sessions for a project in a vertical timeline (newest first):

Each session card displays:
- **Summary** — First user message or session slug
- **Model** — Which Claude model was used (badge)
- **Git branch** — If available
- **Message count** and **file size**
- **Last modified** date and time

**Sub-agents** are shown as nested entries under their parent session with a left border connector. Each sub-agent shows its ID and description (e.g., "Explore codebase structure").

Click any session card to open the full conversation.

### Session Detail

The full conversation view — the core of clarc.

#### Header Bar (sticky)

- **Breadcrumb**: Project name > Session name
- **Metadata**: Model, message count, token usage (input/output/cache), estimated cost, git branch, duration
- **Toggle**: "Show/Hide Thinking" button
- **Export**: "Export .md" link
- **Sub-agents**: If the session spawned sub-agents, they're shown as chips

#### Message Display

Messages are rendered in chronological order:

**User messages** have a blue "User" badge and the timestamp. Content is rendered as markdown.

**Assistant messages** have a gray "Assistant" badge, timestamp, model indicator, and cost. They contain:

1. **Thinking blocks** (collapsible, collapsed by default)
   - Purple/indigo background
   - Shows estimated token count
   - Click to expand/collapse
   - Use the "Show/Hide Thinking" toggle in the header to control all at once

2. **Text content** — Rendered as rich markdown with:
   - Syntax-highlighted code blocks
   - Tables
   - Lists
   - Links

3. **Tool calls** (collapsible, collapsed by default)
   - Green background (red for errors)
   - Shows tool name and a smart summary:
     - `Read` / `Write` / `Edit` → shows the file path
     - `Bash` → shows the command
     - `Glob` / `Grep` → shows the pattern
     - `WebSearch` → shows the query
   - Expand to see full JSON input and result
   - Results are truncated at 5,000 characters

**Command messages** (like `/init`) are cleaned up and not displayed.

**Meta messages** (system instructions) are hidden.

#### Footer

Shows total message count and estimated cost for the session.

### Analytics

A multi-panel dashboard showing usage patterns and costs.

#### Stats Overview

Five cards at the top: Sessions, Messages, Input Tokens, Output Tokens, Total Cost.

#### Cost by Model

Horizontal bar chart showing what percentage of your spend goes to each model. Displays exact dollar amounts.

#### Cache Efficiency

Three metrics:
- **Cache Read Tokens** — How many tokens were served from cache
- **Cache Hit Rate** — Percentage of input tokens served from cache
- **Longest Session** — Duration and message count

#### Activity by Hour

24-bar chart showing which hours of the day you're most active. Hover over bars to see exact counts.

#### Daily Activity Table

Date-by-date breakdown of sessions, messages, and tool calls.

#### Top Projects

Ranked list of projects by session and message counts.

### Search

Full-text search across all your Claude Code sessions.

#### How to Search

1. Type your query in the search box
2. Press **Enter** or click **Search**
3. Results appear below with highlighted snippets

#### What Gets Searched

- All message text content (user and assistant)
- Thinking block content
- Case-insensitive substring matching

#### Search Results

Each result shows:
- **Project name** and **message type** (text or thinking)
- **Date**
- **Snippet** with the matching text highlighted
- Click to jump to the full session

#### Filters (via API)

When using the API directly, you can filter by:
- Project name or ID
- Model
- Date range (after/before)
- Max results

### Tasks

A Kanban-style board showing all tasks created during Claude Code sessions.

Three columns:
- **Pending** — Tasks not yet started
- **In Progress** — Tasks currently being worked on
- **Done** — Completed tasks

Each task card shows:
- Task subject (title)
- Description preview (2 lines)
- Project link
- Dependency indicator ("blocked by N")

**Note:** Tasks are created by Claude Code during sessions (via the TaskCreate tool). If you don't see any tasks, it means no sessions have used the task system.

### Markdown Preview & Export

#### Preview

Navigate to any session and click "Export .md" in the header, or visit `/sessions/{id}/preview` directly.

The preview page shows:
- Rendered markdown of the entire session
- **Checkboxes** to include/exclude thinking blocks and tool calls
- **Copy** button — copies raw markdown to clipboard
- **Download .md** button — downloads the file

#### Export Format

The exported markdown includes:

**YAML frontmatter:**
```yaml
---
title: "session-slug"
project: my-project
session_id: uuid
model: claude-opus-4-6
git_branch: main
started_at: 2026-02-22T10:30:00Z
duration_minutes: 45
messages: 87
tokens: { input: 125000, output: 48000 }
estimated_cost_usd: 0.87
---
```

**Message sections:**
- User messages as `## User — 10:30 AM` with full text
- Assistant messages as `## Assistant — 10:30 AM` with:
  - Thinking in `<details>` blocks (if included)
  - Full text content
  - Tool calls in `<details>` blocks with JSON input/result (if included)

---

## Command-Line Interface

clarc also provides CLI commands for terminal-based access.

### `clarc` (or `clarc serve`)

Starts the web UI server.

```bash
clarc                    # Start on default port 3838
clarc --port 4000        # Custom port
clarc --no-open          # Don't auto-open browser
```

### `clarc status`

Shows a summary of your Claude Code history.

```
$ clarc status
clarc — Claude Archive Status
────────────────────────────────────────
Projects:       3
Sessions:       5
Messages:       861
Sub-agents:     8
Prompt history: 36
First session:  2026-01-14T03:51:20.834Z
Total sessions: 4 (from stats-cache)
```

### `clarc projects`

Lists all projects with session and message counts.

```
$ clarc projects
ClArc                            1 sessions    595 msgs
openclaw                         2 sessions    230 msgs
```

### `clarc search <query>`

Searches across all sessions.

```bash
clarc search "authentication"              # Text output
clarc search "authentication" --json       # JSON output
clarc search "authentication" --limit 5    # Limit results
```

**Output:**
```
[project/session-id] (type) ...matching snippet with context...

3 results
```

### `clarc export <session-id>`

Exports a session as markdown.

```bash
clarc export 6ad2fb8b                           # Print to stdout
clarc export 6ad2fb8b -o session.md             # Save to file
```

You can use a partial session ID (prefix match).

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Jump to Search and focus the search input |
| `?` | Show the keyboard shortcuts help overlay |
| `Esc` | Close the help overlay |

Shortcuts are disabled when you're typing in an input field.

Press `?` at any time to see the shortcuts overlay.

---

## Dark Mode

clarc automatically follows your system's color scheme preference:
- **Light mode** when your OS is set to light
- **Dark mode** when your OS is set to dark

The theme switches automatically — there's no manual toggle in v0.1.

**Color scheme:**

| Element | Light | Dark |
|---------|-------|------|
| Background | White | Slate 900 |
| Cards/panels | Slate 50 | Slate 800 |
| Text | Slate 900 | Slate 100 |
| Accent | Indigo 500 | Indigo 400 |
| Thinking blocks | Violet 50 | Indigo 950 |
| Tool calls | Green 50 | Green 950 |
| Errors | Red 50 | Red 950 |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLARC_CLAUDE_DIR` | `~/.claude` | Path to Claude Code data directory |
| `CLARC_CONFIG_DIR` | `~/.config/clarc` | Path to clarc's own config |
| `CLARC_PORT` | `3838` | Web server port |

### Custom Claude Data Location

If your Claude Code data is in a non-standard location:

```bash
CLARC_CLAUDE_DIR=/path/to/my/.claude clarc
```

### Pricing Customization

Model pricing is defined in `src/shared/pricing.ts`. The defaults match current Anthropic API pricing. To customize, edit the `DEFAULT_PRICING` object before building.

---

## How It Works

### What clarc reads

clarc reads the following from your `~/.claude/` directory:

| Path | What | How Used |
|------|------|----------|
| `projects/*/` | Project directories | Discovers all projects |
| `projects/*/*.jsonl` | Session files | Parses conversations |
| `projects/*/[id]/subagents/agent-*.jsonl` | Sub-agent files | Links agents to parent sessions |
| `todos/*.json` | Task files | Populates task board |
| `stats-cache.json` | Precomputed analytics | Dashboard and analytics |
| `history.jsonl` | Prompt history | Global activity tracking |

### What clarc does NOT read

- `credentials.json` — Never accessed
- `settings.json` — Not currently used
- `debug/` logs — Not displayed
- `cache/`, `downloads/`, `backups/` — Ignored

### What clarc does NOT modify

**Nothing.** All access to `~/.claude/` is read-only. In Docker, the volume is explicitly mounted with `:ro` (read-only). clarc will never create, modify, or delete any files in your Claude Code data directory.

### Data Flow

```
~/.claude/                          clarc server                    Browser
┌────────────────┐                 ┌──────────────┐              ┌──────────┐
│ projects/      │──scan──>        │              │              │          │
│   *.jsonl      │──parse──>       │  In-memory   │──GET /api──> │  React   │
│ stats-cache    │──read──>        │  index       │              │  UI      │
│ history.jsonl  │──read──>        │              │              │          │
│ todos/         │──read──>        │  LRU cache   │              │          │
└────────────────┘                 └──────────────┘              └──────────┘
     READ-ONLY                     Hono on :3838                Vite on :5173
```

### Session Discovery

clarc does NOT rely on any index files. It discovers sessions by:
1. Listing all directories in `~/.claude/projects/`
2. Finding all `*.jsonl` files in each project directory
3. The filename (without `.jsonl`) is the session UUID
4. First 20 lines are read for metadata (model, git branch, summary)

### Sub-Agent Discovery

1. Each session directory may have a `subagents/` subdirectory
2. Files are named `agent-[id].jsonl`
3. The parent session contains `queue-operation` messages that reference the agent ID
4. Sub-agent messages have `isSidechain: true` and an `agentId` field

### Cost Estimation

Costs are estimated from token counts using Anthropic's published pricing:

| Model | Input ($/MTok) | Output ($/MTok) | Cache Read | Cache Create |
|-------|---------------|-----------------|------------|--------------|
| Sonnet 4 | $3.00 | $15.00 | $0.30 | $0.75 |
| Opus 4.5/4.6 | $15.00 | $75.00 | $1.50 | $3.75 |
| Haiku 4.5 | $0.25 | $1.25 | $0.025 | $0.0625 |

Cache tokens (which make up the bulk of token usage in typical sessions) are priced at 10% of the standard input rate, making cached sessions significantly cheaper.

---

## FAQ

### Is clarc safe to use? Will it modify my Claude Code data?

Yes, completely safe. clarc is read-only. It never creates, modifies, or deletes any files in `~/.claude/`. When running in Docker, the directory is mounted with the `:ro` (read-only) flag as an additional safeguard.

### Why are some sessions missing?

clarc discovers sessions by scanning for `.jsonl` files. If a session has no JSONL file (e.g., it was cleaned up or is in an unexpected location), it won't appear. Run `clarc status` to see total counts.

### Why is the cost estimate different from my actual bill?

Cost estimates use approximated pricing and may not account for:
- Volume discounts or custom pricing
- Exact cache pricing tiers
- The 60/40 input/output split assumed for daily token breakdowns
- Tokens from the `stats-cache.json` may overlap with parsed session tokens

Treat cost numbers as estimates, not exact billing figures.

### Can I use clarc with multiple Claude Code installations?

Yes. Point `CLARC_CLAUDE_DIR` to any Claude Code data directory:

```bash
CLARC_CLAUDE_DIR=/other/path/.claude clarc
```

### How do I refresh the data?

clarc caches the project index in memory. To refresh:
- **Web UI**: The data loads fresh on each page navigation
- **API**: Send `POST /api/reindex` to force a full re-scan
- **Restart**: Restarting clarc clears all caches

### Can I run clarc on a remote server?

Yes. The web UI works over any HTTP connection. Start clarc on the server and access it from your browser. Note that clarc has no authentication — anyone who can reach the port can browse your session history.

### What browsers are supported?

clarc uses modern CSS and JavaScript. Any recent version of Chrome, Firefox, Safari, or Edge will work. The UI is desktop-first but responsive on smaller screens.

### How much memory does clarc use?

The in-memory index is lightweight (a few MB for most histories). The LRU session cache holds up to 50 parsed sessions. Very large histories (thousands of sessions) may use more memory during scanning.

### Can I export all sessions at once?

Currently, the web UI exports one session at a time. For bulk export, use the CLI:

```bash
# Export a specific session
clarc export <session-id> -o output.md
```

Bulk project export is planned for a future version.
