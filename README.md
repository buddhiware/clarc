# clarc

Browse, search, and analyze your [Claude Code](https://claude.ai/code) conversation history — locally.

clarc reads session data from `~/.claude/` and presents it through an interactive web interface with search, analytics, bookmarks, and visualization. Your data never leaves your machine.

## Features

- **Dashboard** — overview with stats, activity charts, and bookmarked sessions
- **Session viewer** — full conversation browser with thinking blocks, tool calls, and syntax highlighting
- **Analytics** — cost tracking, token usage by model, daily activity heatmaps
- **Full-text search** — search across all sessions with project/model/date filters
- **Task browser** — view Claude Code task lists across projects
- **Markdown export** — export sessions for sharing
- **Keyboard shortcuts** — vim-style navigation (`[`/`]` between sessions, `/` to search)
- **Dark mode** — custom theming with CSS variables

## Quick Start

### Docker (recommended)

```bash
git clone <repo-url> && cd clarc
make dev
# Open http://localhost:3838
```

Mounts `~/.claude/` read-only into the container. Data syncs automatically on startup and every 5 minutes.

### Standalone Binary

```bash
make build
./dist-binary/clarc
# Open http://localhost:3838
```

The compiled binary is portable — stores its data directory next to the executable.

### Direct with Bun

```bash
bun install
bun run dev
# Vite: http://localhost:5173  |  API: http://localhost:3838
```

### Desktop App (Tauri)

```bash
make tauri-build-host   # requires Bun + Rust
```

Builds a native desktop app with system tray. Pre-built binaries for Linux, macOS (Intel + Apple Silicon), and Windows are available on the [Releases](../../releases) page.

## How It Works

```
~/.claude/ (read-only)
    ↓  sync (add-only, every 5 min)
~/.config/clarc/data/
    ↓  scan & parse
Hono API (:3838)
    ↓
React UI
```

clarc **never modifies** your `~/.claude/` directory. It syncs a read-only copy into its own working directory, then indexes and serves it through a local API.

## Configuration

Create `~/clarc.json` (binary) or `~/.config/clarc/clarc.json` (dev):

```json
{
  "sourceDir": "/path/to/.claude",
  "dataDir": "/path/to/data",
  "port": 3838,
  "syncIntervalMs": 300000
}
```

All settings can also be overridden with environment variables: `CLARC_CLAUDE_DIR`, `CLARC_DATA_DIR`, `CLARC_PORT`, `CLARC_SYNC_INTERVAL_MS`.

## Tech Stack

Bun, Hono, React 19, Vite, Tailwind CSS 4, Recharts, Commander, Tauri 2

## Documentation

- [User Guide](docs/USER_GUIDE.md) — installation, features, keyboard shortcuts, FAQ
- [Developer Guide](docs/DEV_GUIDE.md) — architecture, data layer, API reference, adding features
- [Data Format Reference](DATAFORMAT.md) — Claude Code's `~/.claude/` directory structure

## License

Licensed under the [Apache License 2.0](LICENSE).
