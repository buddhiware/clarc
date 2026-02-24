# clarc User Guide

**clarc** (Claude Archive) is a local tool that reads your Claude Code session history from `~/.claude/` and presents it as a browsable web interface with search, analytics, markdown export, sub-agent visualization, and a context panel for deep-diving into conversations.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Web Interface](#web-interface)
   - [Dashboard](#dashboard)
   - [Projects](#projects)
   - [Session Detail](#session-detail)
   - [Context Panel](#context-panel)
   - [Analytics](#analytics)
   - [Search](#search)
   - [Tasks](#tasks)
   - [Markdown Preview & Export](#markdown-preview--export)
4. [Data Sync](#data-sync)
5. [Command-Line Interface](#command-line-interface)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Dark Mode](#dark-mode)
8. [Configuration](#configuration)
9. [How It Works](#how-it-works)
10. [Help Page](#help-page)
11. [FAQ](#faq)

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
6. Click any **agent chip** or **tool expand icon** to open the **Context Panel** for a deeper look

clarc syncs your `~/.claude/` directory to a local copy at `~/.config/clarc/data/` at startup and every 5 minutes. It reads from this local copy and never modifies your source data.

---

## Web Interface

### Dashboard

The home page shows an overview of your entire Claude Code history:

- **Gradient Hero Stats** -- Animated stat cards displaying total projects, sessions, messages, and estimated cost. Each card uses a color gradient background and animates in on page load.
- **Daily Activity Chart** -- An interactive recharts AreaChart showing messages per day. Hover over any point to see the exact date and count in a tooltip.
- **Model Usage Table** -- Token counts and cost breakdown per model (Opus, Sonnet, Haiku). Rows highlight on hover for easy reading.
- **Project Cards** -- Quick links to each project with session and message counts. Cards display a subtle glow effect on hover.

### Projects

#### Sidebar

The left sidebar is always visible and shows:

- **clarc Logo** -- The word "clarc" rendered with a text-gradient effect at the top of the sidebar
- **Navigation Links** -- Dashboard, Analytics, Search, Tasks, Help -- each with an icon alongside the label
- **Filter** -- Type to filter projects by name
- **Project List** -- All projects sorted by last activity, showing:
  - Project name
  - Session count and message count
  - Relative time since last activity (e.g., "2h ago")
  - A hover chevron appears on the right side of each project row on mouseover

Click a project to open its detail view.

#### Project Detail

Shows all sessions for a project using a visual **SessionTimeline** component:

- **Vertical rail** with circle nodes for each session
- **Date grouping** -- Sessions are grouped under headers like "Today", "Yesterday", "This Week", or month names for older sessions
- **Session info** -- Each node shows the session summary, model badge, git branch, message count, and last modified time
- **Sub-agents** are shown as branching nodes connected to their parent session with dashed connectors
- **Quick-preview eye icon** -- Appears on hover for each session node. Click it to open the session in the Context Panel without leaving the timeline view
- **Clickable agent nodes** -- Clicking a sub-agent node opens that agent's conversation in the Context Panel

### Session Detail

The full conversation view -- the core of clarc.

#### Glass Header (sticky)

The session header uses a frosted glass blur effect and remains fixed at the top as you scroll:

- **Breadcrumb** -- Project name > Session name, separated by chevrons. Includes a copy-session-ID button for quick reference.
- **Metadata Badges** -- Key session info displayed as styled Badge components:
  - Model name
  - Message count
  - Token usage (input/output/cache)
  - Estimated cost (color-coded: green for low, amber for moderate, red for high)
  - Git branch (if available)
  - Duration
  - Date
- **Toggle** -- "Show/Hide Thinking" button
- **Export** -- "Export .md" link
- **Agent Chips** -- If the session spawned sub-agents, they appear as clickable buttons in the header. Clicking an agent chip opens that agent's conversation in the Context Panel.

#### Scroll Progress Bar

A thin progress bar at the very top of the viewport fills left to right as you scroll through the conversation, indicating how far into the session you are.

#### Message Display

Messages are grouped into **Conversation Turns**. A turn consists of one user message followed by all subsequent assistant messages until the next user message. This grouping makes long conversations easier to follow.

**User messages** display with:
- A circular avatar with "U"
- A bubble card with a subtle border
- Rendered markdown content and timestamp

**Assistant messages** display with:
- A sparkle avatar icon
- A cost badge (green for cheap, amber for moderate, red for expensive turns)
- Full rendered content including:

1. **Thinking blocks** (collapsible, collapsed by default)
   - Gradient border styling
   - SVG chevron icon that animates smoothly on expand/collapse
   - Token count badge showing how many tokens the thinking block contains
   - Use the "Show/Hide Thinking" toggle in the header to control all at once

2. **Text content** -- Rendered as rich markdown with:
   - Syntax-highlighted code blocks
   - Tables
   - Lists
   - Links

3. **Tool calls** (collapsible, collapsed by default)
   - Per-tool icons for quick visual identification:
     - Terminal icon for `Bash`
     - Eye icon for `Read`
     - Pencil icon for `Edit`
     - (Other tools use a default icon)
   - Smart summary line:
     - `Read` / `Write` / `Edit` -- shows the file path
     - `Bash` -- shows the command
     - `Glob` / `Grep` -- shows the pattern
     - `WebSearch` -- shows the query
   - Error states show a pulsing red dot indicator
   - "Open in panel" button to view the full tool call details in the Context Panel
   - Expand to see full JSON input and result
   - Results are truncated at 5,000 characters

**Command messages** (like `/init`) are cleaned up and not displayed.

**Meta messages** (system instructions) are hidden.

#### Floating Scroll Navigation Pill

A small floating pill appears in the bottom-right corner of the viewport. It provides quick navigation controls to jump to the top or bottom of the conversation.

#### Keyboard Navigation

While viewing a session, press `[` to go to the previous session in the same project or `]` to go to the next session. This allows rapid browsing without returning to the project timeline.

### Context Panel

The Context Panel is an artifact-style side panel (480px wide) that slides in from the right side of the screen. It provides a focused view of related content without navigating away from your current page.

#### What It Shows

- **Agent conversations** -- Full sub-agent conversation threads
- **Tool call details** -- Expanded view of any tool call's input and output
- **Session previews** -- Quick look at a session from the project timeline

#### How to Open It

- Click an **agent chip** in the session detail header
- Click an **agent node** on the project timeline
- Click a **tool call "open in panel" button** in the session detail view
- Click the **eye icon** on a session node in the project timeline

#### How to Close It

- Click the **X button** in the panel header
- Press **Esc**
- Click outside the panel area

#### Behavior

- The panel **pushes the main content narrower** rather than overlaying it, so you never lose sight of your current page.
- The panel maintains a **navigation history stack**, so if you open an agent from within the panel, you can navigate back to the previous panel view.

### Analytics

A multi-panel dashboard showing usage patterns and costs, built with real recharts visualizations.

#### Stats Overview

Five cards at the top: Sessions, Messages, Input Tokens, Output Tokens, Total Cost.

#### Cost by Model

A recharts horizontal BarChart showing what percentage of your spend goes to each model. Displays exact dollar amounts on hover.

#### Cost Over Time

A recharts AreaChart showing your cumulative or daily cost trend. Hover to see the cost for any specific day.

#### Token Usage Over Time

A stacked recharts AreaChart showing input, output, and cache token usage over time. Each token type is a separate colored area, making it easy to see how your token mix changes day to day.

#### Activity by Hour

A recharts BarChart showing which hours of the day you are most active. Hover over bars to see exact message counts.

#### Activity Heatmap

A GitHub-style contribution heatmap rendered as a CSS grid (7 rows by 24 columns). Each cell represents one day, with color intensity corresponding to the number of messages. Provides an at-a-glance view of your activity patterns over time.

#### Cache Efficiency

A circular SVG indicator showing your overall cache hit rate as a percentage. The ring fills proportionally and changes color based on efficiency (higher is better). Also displays total cache read tokens and longest session stats.

#### Daily Activity Table

A scrollable table with a sticky header and alternating row shading. Shows date-by-date breakdown of sessions, messages, and tool calls.

#### Top Projects

Ranked list of projects by session and message counts, with horizontal bars indicating relative volume.

### Search

Full-text search across all your Claude Code sessions.

#### Glass Search Bar

The search input uses a glass-style container with a search icon embedded inside the input field. Press `/` from anywhere in the app to jump directly to search and focus the input.

#### How to Search

1. Type your query in the search box
2. Press **Enter** or click **Search**
3. A skeleton loading animation appears while results are fetched
4. Results appear as staggered cards with badges

#### What Gets Searched

- All message text content (user and assistant)
- Thinking block content
- Case-insensitive substring matching

#### Search Results

Each result card shows:
- **Project name** and **message type** badges (text or thinking)
- **Date**
- **Snippet** with the matching text highlighted
- Click to jump to the full session

Results animate in with a staggered entrance effect.

#### Filters (via API)

When using the API directly, you can filter by:
- Project name or ID
- Model
- Date range (after/before)
- Max results

### Tasks

A Kanban-style board showing all tasks created during Claude Code sessions.

Three columns with colored headers (a 3px colored top border distinguishes each column):
- **Pending** -- Tasks not yet started
- **In Progress** -- Tasks currently being worked on
- **Done** -- Completed tasks

Each task card shows:
- A left color indicator strip matching the column color
- Task subject (title)
- Description preview (2 lines)
- Project link
- Dependency indicator with a **pulsing red dot** for blocked tasks ("blocked by N")

When a column has no tasks, a styled **empty state** component is displayed with a message and icon.

**Note:** Tasks are created by Claude Code during sessions (via the TaskCreate tool). If you don't see any tasks, it means no sessions have used the task system.

### Markdown Preview & Export

#### Preview

Navigate to any session and click "Export .md" in the header, or visit `/sessions/{id}/preview` directly.

The preview page shows:
- Rendered markdown of the entire session
- A glass-style toolbar with controls:
  - **Checkboxes** to include/exclude thinking blocks and tool calls
  - **Copy** button -- copies raw markdown to clipboard
  - **Download .md** button -- downloads the file

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
- User messages as `## User -- 10:30 AM` with full text
- Assistant messages as `## Assistant -- 10:30 AM` with:
  - Thinking in `<details>` blocks (if included)
  - Full text content
  - Tool calls in `<details>` blocks with JSON input/result (if included)

---

## Data Sync

clarc maintains a local copy of your Claude Code data to ensure safe, read-only access.

### How It Works

- At **startup**, clarc syncs files from `~/.claude/` to `~/.config/clarc/data/`
- The sync runs again automatically **every 5 minutes**
- The sync is **add-only** -- it copies new and updated files but never deletes files from the local copy, even if they are removed from the source
- The scanner and parser read exclusively from the local copy at `~/.config/clarc/data/`, never from `~/.claude/` directly

### Manual Sync

- Send `POST /api/sync` to trigger a sync on demand
- Running a reindex (`POST /api/reindex`) automatically triggers a sync first, so you always get fresh data

### Why Sync?

Syncing provides an extra safety layer. Your original `~/.claude/` directory is never held open or locked by clarc. The local copy also allows clarc to operate normally even if the source directory is temporarily unavailable.

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
clarc -- Claude Archive Status
----------------------------------------
Projects:       3
Sessions:       5
Messages:       861
Sub-agents:     8
Prompt history: 36
First session:  2026-01-14T03:51:20.834Z
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
| `/` | Jump to search and focus the search input |
| `?` | Show the keyboard shortcuts overlay |
| `Esc` | Close panel, overlay, or go back |
| `[` | Previous session (in session view) |
| `]` | Next session (in session view) |

Shortcuts are disabled when you are typing in an input field.

Press `?` at any time to see the shortcuts overlay.

---

## Dark Mode

clarc automatically follows your system's color scheme preference:
- **Light mode** when your OS is set to light
- **Dark mode** when your OS is set to dark

The theme switches automatically based on your system setting.

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

In v0.2, gradient backgrounds and glass effects (frosted blur on headers, panels, and search bars) adapt to the active color scheme. Gradients shift to darker tones in dark mode, and glass blur effects adjust their background opacity accordingly.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLARC_CLAUDE_DIR` | `~/.claude` | Path to Claude Code data directory |
| `CLARC_CONFIG_DIR` | `~/.config/clarc` | Path to clarc's own config and synced data |
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

clarc syncs and reads the following from your `~/.claude/` directory:

| Path | What | How Used |
|------|------|----------|
| `projects/*/` | Project directories | Discovers all projects |
| `projects/*/*.jsonl` | Session files | Parses conversations |
| `projects/*/[id]/subagents/agent-*.jsonl` | Sub-agent files | Links agents to parent sessions |
| `todos/*.json` | Task files | Populates task board |
| `history.jsonl` | Prompt history | Global activity tracking |

### What clarc does NOT read

- `credentials.json` -- Never accessed
- `settings.json` -- Not currently used
- `debug/` logs -- Not displayed
- `cache/`, `downloads/`, `backups/` -- Ignored

### What clarc does NOT modify

**Nothing.** All access to `~/.claude/` is read-only. In Docker, the volume is explicitly mounted with `:ro` (read-only). clarc syncs files to its own local copy at `~/.config/clarc/data/` and reads from there. It will never create, modify, or delete any files in your Claude Code data directory.

### Data Flow

```
~/.claude/               Sync layer              clarc server                Browser
+----------------+      +---------------+       +--------------+          +----------+
| projects/      |      |               |       |              |          |          |
|   *.jsonl      |--+-->| ~/.config/    |       |  In-memory   |--GET /-->|  React   |
| history.jsonl  |  |   |   clarc/data/ |--+--->|  index       |  api     |  UI      |
| todos/         |--+   |               |  |    |              |          |          |
+----------------+      | (add-only     |  |    |  LRU cache   |          | Context  |
     READ-ONLY          |  mirror)      |  |    |              |          | Panel    |
                        +---------------+  |    +--------------+          +----------+
                                           |    Hono on :3838            Vite on :5173
                         Startup + every   |
                         5 minutes         |
                                           +--- Scanner/parser read
                                                from local copy only
```

### Session Discovery

clarc does NOT rely on any index files. It discovers sessions by:
1. Syncing files from `~/.claude/` to the local data directory
2. Listing all directories in the synced `projects/` folder
3. Finding all `*.jsonl` files in each project directory
4. The filename (without `.jsonl`) is the session UUID
5. All lines in each session file are scanned for metadata extraction (model, git branch, summary, token counts)

### Sub-Agent Discovery

1. Each session directory may have a `subagents/` subdirectory
2. Files are named `agent-[id].jsonl`
3. The parent session contains `queue-operation` messages that reference the agent ID
4. Sub-agent messages have `isSidechain: true` and an `agentId` field

### Cost Estimation

Costs are derived exclusively from session data. Token usage is extracted from every assistant message in every session file, and costs are computed per-message using Anthropic's published pricing:

| Model | Input ($/MTok) | Output ($/MTok) | Cache Read | Cache Create |
|-------|---------------|-----------------|------------|--------------|
| Sonnet 4 | $3.00 | $15.00 | $0.30 | $0.75 |
| Opus 4.5/4.6 | $15.00 | $75.00 | $1.50 | $3.75 |
| Haiku 4.5 | $0.25 | $1.25 | $0.025 | $0.0625 |

Because costs are computed from individual session token data, the dashboard totals always equal the sum of all individual session costs. Cache tokens (which make up the bulk of token usage in typical sessions) are priced at 10% of the standard input rate, making cached sessions significantly cheaper.

---

## Help Page

clarc includes an in-app help page available at `/help` or via the Help link in the sidebar.

The help page covers:
- **Feature overview** -- Descriptions of every major section of the app
- **Keyboard shortcuts** -- Full reference table
- **Data privacy** -- How clarc handles your data, what it reads, and what it never touches
- **Cost estimation** -- How costs are calculated and why they may differ from your actual bill

---

## FAQ

### Is clarc safe to use? Will it modify my Claude Code data?

Yes, completely safe. clarc is read-only. It syncs your files to a local copy at `~/.config/clarc/data/` and reads from there. It never creates, modifies, or deletes any files in `~/.claude/`. When running in Docker, the source directory is mounted with the `:ro` (read-only) flag as an additional safeguard.

### Why are some sessions missing?

clarc discovers sessions by scanning for `.jsonl` files. If a session has no JSONL file (e.g., it was cleaned up or is in an unexpected location), it won't appear. Run `clarc status` to see total counts.

### Why is the cost estimate different from my actual bill?

Cost estimates are derived from token usage in your session data and use Anthropic's published API pricing. They may differ from your actual bill due to:
- Volume discounts or custom pricing on your account
- Exact cache pricing tier differences
- Tokens that are tracked differently in the billing system

Treat cost numbers as estimates, not exact billing figures.

### What is the context panel?

The Context Panel is a side panel that slides in from the right side of the screen. It lets you view sub-agent conversations, tool call details, and session previews without navigating away from your current page. You can open it by clicking agent chips, agent nodes on the timeline, tool "open in panel" buttons, or the eye icon on session nodes. Close it with the X button, the Esc key, or by clicking outside the panel.

### How does data sync work?

clarc copies files from `~/.claude/` to `~/.config/clarc/data/` at startup and every 5 minutes. The sync is add-only -- new and updated files are copied, but files are never deleted from the local copy. The scanner and parser read exclusively from this local copy. You can trigger a manual sync with `POST /api/sync`, or run a reindex (`POST /api/reindex`) which automatically syncs first.

### Can I use clarc with multiple Claude Code installations?

Yes. Point `CLARC_CLAUDE_DIR` to any Claude Code data directory:

```bash
CLARC_CLAUDE_DIR=/other/path/.claude clarc
```

### How do I refresh the data?

Data auto-syncs from `~/.claude/` every 5 minutes and at startup. To refresh manually:
- **API**: Send `POST /api/sync` to sync latest files, or `POST /api/reindex` to sync and rebuild the full index
- **Web UI**: Data loads fresh on each page navigation from the in-memory index
- **Restart**: Restarting clarc triggers a fresh sync and clears all caches

### Can I run clarc on a remote server?

Yes. The web UI works over any HTTP connection. Start clarc on the server and access it from your browser. Note that clarc has no authentication -- anyone who can reach the port can browse your session history.

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
