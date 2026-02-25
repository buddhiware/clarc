# clarc — Tauri v2 Desktop App

## Context

clarc currently runs as either a Docker dev environment or a standalone Bun-compiled binary (91MB) that starts an HTTP server and requires the user to open a browser. The goal is to ship clarc as a native desktop application with an embedded webview — no browser needed. The user clicks the app icon, and clarc opens as a native window.

**Tauri v2** is the chosen approach: it wraps a system webview (WebKit on macOS/Linux, WebView2 on Windows) around the frontend, and bundles the Bun backend as a **sidecar** binary. This gives us:
- Native window chrome on every OS
- Smaller download (no bundled browser engine)
- Cross-platform builds (Windows, macOS, Linux) via GitHub Actions
- System tray support for background operation
- Single app bundle distribution

---

## Architecture

```
┌──────────────────────────────────┐
│          Tauri App Shell         │
│  (Rust - native window + tray)  │
│                                  │
│  ┌────────────────────────────┐  │
│  │    System WebView          │  │
│  │  (loads Vite-built React)  │  │
│  │                            │  │
│  │  fetch('/api/...')         │  │
│  │       │                    │  │
│  └───────┼────────────────────┘  │
│          │                       │
│          │ HTTP localhost:PORT    │
│          ▼                       │
│  ┌────────────────────────────┐  │
│  │  Bun Sidecar (clarc-core)  │  │
│  │  Hono API server           │  │
│  │  Data sync engine          │  │
│  │  Session parser            │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

The frontend (React) loads from Tauri's embedded assets (the Vite build output). API calls go to `http://localhost:PORT` where the Bun sidecar is listening. The Rust layer handles:
- Window lifecycle (show, hide, minimize, close)
- Spawning/killing the sidecar process
- System tray icon and menu
- Finding a free port and passing it to the sidecar

---

## Changes

### Phase 1: Project Setup

#### 1.1 Initialize Tauri v2 in the project

Run `bun add -D @tauri-apps/cli@latest` and `bun tauri init` to scaffold the Tauri structure.

This creates:
```
src-tauri/
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
├── capabilities/       # Permission capabilities
├── icons/              # App icons (all sizes)
├── src/
│   ├── main.rs         # Rust entry point (or lib.rs)
│   └── ...
└── build.rs            # Build script
```

#### 1.2 Configure `tauri.conf.json`

```json
{
  "productName": "clarc",
  "version": "0.2.0",
  "identifier": "com.j2ww.clarc",
  "build": {
    "frontendDist": "../dist",
    "beforeBuildCommand": "bun run build:client",
    "beforeDevCommand": "bun run dev:client"
  },
  "app": {
    "windows": [
      {
        "title": "clarc",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:* http://127.0.0.1:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"],
    "externalBin": ["binaries/clarc-core"]
  }
}
```

#### 1.3 Add Tauri plugins

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"        # For sidecar spawning
tauri-plugin-process = "2"      # For app exit/restart
portpicker = "0.1"              # Find free port
```

```json
// package.json devDependencies
"@tauri-apps/cli": "^2",
"@tauri-apps/api": "^2",
"@tauri-apps/plugin-shell": "^2",
"@tauri-apps/plugin-process": "^2"
```

### Phase 2: Sidecar Setup

#### 2.1 Refactor the Bun binary into `clarc-core`

The current `clarc` binary does both CLI and server. For Tauri, split into:
- **`clarc-core`** — The Bun-compiled backend (Hono server + sync + scanner). This is the sidecar.
- **`clarc`** — The Tauri desktop app (replaces the old top-level binary).

Modify `package.json` build scripts:
```json
{
  "scripts": {
    "build:client": "vite build",
    "build:core": "bun build --compile src/cli/main.ts --outfile src-tauri/binaries/clarc-core-${TARGET_TRIPLE}",
    "build:tauri": "bun tauri build",
    "dev:client": "vite",
    "dev:tauri": "bun tauri dev"
  }
}
```

The sidecar binary must be named with the Rust target triple suffix:
- `clarc-core-x86_64-unknown-linux-gnu` (Linux x64)
- `clarc-core-x86_64-apple-darwin` (macOS Intel)
- `clarc-core-aarch64-apple-darwin` (macOS Apple Silicon)
- `clarc-core-x86_64-pc-windows-msvc.exe` (Windows x64)

#### 2.2 Modify `src/cli/main.ts` — Accept `--port` flag for sidecar mode

When Tauri spawns the sidecar, it passes a dynamically chosen port:

```typescript
// In main.ts, detect sidecar mode:
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1) {
  process.env.CLARC_PORT = process.argv[portArgIdx + 1];
}
```

This ensures the sidecar listens on whatever free port Tauri found.

#### 2.3 Modify `src/server/index.ts` — Add readiness signal

After the server starts listening, print a machine-readable line so Tauri knows when it's ready:

```typescript
console.log(`__CLARC_READY__ http://localhost:${PORT}`);
```

Tauri's Rust code watches stdout for this line before loading the webview URL.

### Phase 3: Rust Backend (src-tauri/src/main.rs)

#### 3.1 Core Rust logic

```rust
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

struct AppState {
    port: u16,
    sidecar_child: Option<tauri_plugin_shell::process::CommandChild>,
}

fn main() {
    // Find a free port
    let port = portpicker::pick_unused_port().expect("No free port");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(AppState { port, sidecar_child: None }))
        .setup(move |app| {
            let handle = app.handle().clone();

            // Spawn sidecar with the chosen port
            let sidecar = handle.shell()
                .sidecar("clarc-core")
                .expect("failed to create sidecar command")
                .args(["serve", "--port", &port.to_string()]);

            let (mut rx, child) = sidecar.spawn()
                .expect("failed to spawn sidecar");

            // Store child handle for cleanup
            let state = handle.state::<Mutex<AppState>>();
            state.lock().unwrap().sidecar_child = Some(child);

            // Watch stdout for readiness signal
            let handle_clone = handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Stdout(line) = event {
                        let line = String::from_utf8_lossy(&line);
                        if line.contains("__CLARC_READY__") {
                            // Navigate webview to the server URL
                            if let Some(window) = handle_clone.get_webview_window("main") {
                                let url = format!("http://localhost:{}", port);
                                let _ = window.navigate(url.parse().unwrap());
                            }
                            break;
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill sidecar on window close
                let state = window.state::<Mutex<AppState>>();
                if let Some(child) = state.lock().unwrap().sidecar_child.take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 3.2 System tray (optional, nice-to-have)

```rust
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};
use tauri::menu::{Menu, MenuItem};

// In setup():
let show = MenuItem::with_id(app, "show", "Show clarc", true, None::<&str>)?;
let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
let menu = Menu::with_items(app, &[&show, &quit])?;

TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&menu)
    .on_menu_event(|app, event| {
        match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        }
    })
    .build(app)?;
```

### Phase 4: Frontend Adjustments

#### 4.1 Modify API base URL

The frontend needs to connect to the dynamic port. Two options:

**Option A (simpler):** Have Tauri inject the port as a `window.__CLARC_PORT__` global before the app loads, then use it in useApi:

```typescript
// src/ui/hooks/useApi.ts
const port = (window as any).__CLARC_PORT__;
const API_BASE = port ? `http://localhost:${port}/api` : '/api';
```

**Option B (simplest):** Have the Tauri webview navigate directly to `http://localhost:PORT` after the sidecar is ready. The frontend then uses relative `/api` paths as today — same-origin, no changes needed.

**Recommendation:** Option B. The Rust code already does `window.navigate(url)` after the readiness signal. The frontend code stays exactly the same.

#### 4.2 Loading screen

While the sidecar starts up, Tauri shows the initial `index.html` from the embedded assets. This can be a simple splash/loading screen. Once the sidecar signals readiness, the webview navigates to the live server URL.

Create `src-tauri/loading.html`:
```html
<!DOCTYPE html>
<html>
<head><title>clarc</title></head>
<body style="display:flex; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:#e2e8f0; font-family:Inter,sans-serif;">
  <div style="text-align:center;">
    <h1 style="font-size:2rem; background:linear-gradient(135deg,#818cf8,#06b6d4,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">clarc</h1>
    <p style="opacity:0.6; margin-top:8px;">Starting up...</p>
  </div>
</body>
</html>
```

Set `frontendDist` to point to this initially, then navigate to the live server.

### Phase 5: Build & CI

#### 5.1 Local build

```bash
# Build the sidecar for current platform
TARGET=$(rustc --print host-tuple)
bun build --compile src/cli/main.ts --outfile "src-tauri/binaries/clarc-core-${TARGET}"

# Build the Tauri app
bun tauri build
```

Output: platform-specific installer/bundle in `src-tauri/target/release/bundle/`

#### 5.2 GitHub Actions CI (cross-platform)

Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: macos-13
            target: x86_64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install Bun
        uses: oven-sh/setup-bun@v2

      - name: Install deps
        run: bun install

      - name: Install Linux deps
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential \
            libssl-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Build sidecar
        run: bun build --compile src/cli/main.ts --outfile "src-tauri/binaries/clarc-core-${{ matrix.target }}"

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'clarc ${{ github.ref_name }}'
          releaseBody: 'See the changelog for details.'
```

This builds and publishes platform-specific installers as GitHub Releases.

#### 5.3 Update Makefile

```makefile
# Existing targets unchanged

# New Tauri targets
tauri-dev:
	bun tauri dev

tauri-build:
	TARGET=$$(rustc --print host-tuple) && \
	bun build --compile src/cli/main.ts --outfile "src-tauri/binaries/clarc-core-$$TARGET" && \
	bun tauri build

tauri-icons:
	bun tauri icon src-tauri/icons/app-icon.png
```

### Phase 6: Keep CLI Working

The `clarc-core` sidecar binary doubles as the CLI. Users who want CLI-only access can still run:
```bash
clarc-core status
clarc-core projects
clarc-core search "query"
clarc-core serve          # Starts server without Tauri window
```

No changes needed — the existing `src/cli/main.ts` entry point already handles both modes.

### Phase 7: Data & Config Path Updates

#### 7.1 Modify `src/shared/paths.ts` and `src/shared/config.ts`

Add Tauri app data directory detection. When running as a sidecar inside Tauri, the binary should use platform-standard app data locations:

```typescript
function getDefaultDataDir(): string {
  const execName = basename(process.execPath);

  // Tauri sidecar — use platform app data dir
  if (process.env.CLARC_APP_DATA) {
    return join(process.env.CLARC_APP_DATA, 'data');
  }

  if (execName === 'clarc' || execName.startsWith('clarc-core')) {
    return join(dirname(process.execPath), 'data');
  }

  return join(CONFIG_DIR, 'data');
}
```

The Rust code passes `CLARC_APP_DATA` when spawning the sidecar, pointing to the platform-standard app data directory:
- macOS: `~/Library/Application Support/com.j2ww.clarc/`
- Linux: `~/.local/share/com.j2ww.clarc/`
- Windows: `%APPDATA%\com.j2ww.clarc\`

---

## Files

| File | Action |
|------|--------|
| `src-tauri/` | **CREATE** — Entire Tauri project directory (scaffolded by `tauri init`) |
| `src-tauri/src/main.rs` | **CREATE** — Rust entry point: sidecar spawning, port management, system tray |
| `src-tauri/tauri.conf.json` | **CREATE** — App configuration, window settings, CSP, sidecar declaration |
| `src-tauri/Cargo.toml` | **CREATE** — Rust dependencies |
| `src-tauri/loading.html` | **CREATE** — Splash screen shown while sidecar starts |
| `src-tauri/icons/` | **CREATE** — App icons for all platforms (generated by `tauri icon`) |
| `.github/workflows/release.yml` | **CREATE** — Cross-platform CI build and release |
| `src/cli/main.ts` | **MODIFY** — Accept `--port` flag for sidecar mode |
| `src/server/index.ts` | **MODIFY** — Print readiness signal on startup |
| `src/shared/paths.ts` | **MODIFY** — Add Tauri app data directory detection |
| `src/shared/config.ts` | **MODIFY** — Support Tauri app data path for config file |
| `package.json` | **MODIFY** — Add Tauri dev dependencies and build scripts |
| `Makefile` | **MODIFY** — Add tauri-dev and tauri-build targets |

## What Stays Unchanged

- All React components, pages, hooks, styles
- All Hono API routes
- All data layer code (sync, scanner, parser, stats, tasks)
- `useApi` hook (relative `/api` paths still work via Option B)
- Docker development environment (keeps working as-is)
- Standalone `clarc-core` binary works independently of Tauri

## Verification

1. `bun tauri dev` — Opens native window, shows loading screen, then clarc UI
2. Click through all pages — Dashboard, projects, sessions, analytics, search, settings
3. Bookmarks and archives work (localStorage in webview persists)
4. Settings page data section works (sidecar has filesystem access)
5. Reindex/sync works from the UI
6. System tray — close window → app stays in tray → click tray → window reappears
7. `bun tauri build` — Produces installer for current platform
8. GitHub Actions — Builds for all 4 targets on tag push
9. `clarc-core status` — CLI still works standalone
10. Docker `make dev` — Unchanged, still works
