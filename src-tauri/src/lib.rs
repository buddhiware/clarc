use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

struct AppState {
    port: u16,
    sidecar_child: Option<tauri_plugin_shell::process::CommandChild>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Find a free port for the sidecar
    let port = portpicker::pick_unused_port().expect("No free TCP port available");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(AppState {
            port,
            sidecar_child: None,
        }))
        .setup(move |app| {
            let handle = app.handle().clone();

            // Resolve platform app data directory for the sidecar
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let app_data_str = app_data_dir.to_string_lossy().to_string();

            // Resolve resource directory so the sidecar can serve the frontend
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");
            let dist_dir = resource_dir.join("dist");
            let dist_dir_str = dist_dir.to_string_lossy().to_string();

            // Try to spawn the clarc-core sidecar.
            // In dev mode (tauri dev), the sidecar binary may not exist — that's OK
            // because beforeDevCommand starts the server directly.
            match handle
                .shell()
                .sidecar("clarc-core")
            {
                Ok(cmd) => {
                    let sidecar = cmd
                        .args(["serve", "--port", &port.to_string()])
                        .env("CLARC_APP_DATA", &app_data_str)
                        .env("CLARC_DIST_DIR", &dist_dir_str);

                    match sidecar.spawn() {
                        Ok((mut rx, child)) => {
                            // Store the child handle for cleanup on exit
                            let state = handle.state::<Mutex<AppState>>();
                            state.lock().unwrap().sidecar_child = Some(child);

                            // Watch sidecar stdout for the readiness signal
                            let handle_for_ready = handle.clone();
                            let port_for_ready = port;
                            tauri::async_runtime::spawn(async move {
                                use tauri_plugin_shell::process::CommandEvent;
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        CommandEvent::Stdout(line) => {
                                            let line = String::from_utf8_lossy(&line);
                                            if line.contains("__CLARC_READY__") {
                                                // Navigate the webview to the running server
                                                if let Some(window) =
                                                    handle_for_ready.get_webview_window("main")
                                                {
                                                    let url = format!(
                                                        "http://localhost:{}",
                                                        port_for_ready
                                                    );
                                                    let _ = window.navigate(
                                                        url.parse().expect("invalid URL"),
                                                    );
                                                }
                                                break;
                                            }
                                        }
                                        CommandEvent::Stderr(line) => {
                                            let line = String::from_utf8_lossy(&line);
                                            eprintln!("[clarc-core] {}", line);
                                        }
                                        CommandEvent::Error(err) => {
                                            eprintln!("[clarc-core] error: {}", err);
                                        }
                                        CommandEvent::Terminated(status) => {
                                            eprintln!(
                                                "[clarc-core] terminated: {:?}",
                                                status
                                            );
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!(
                                "[tauri] Could not spawn sidecar (dev mode?): {}",
                                e
                            );
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "[tauri] Sidecar binary not found (dev mode?): {}",
                        e
                    );
                }
            }

            // Build system tray
            build_tray(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill the sidecar when the window closes
                let state = window.state::<Mutex<AppState>>();
                let mut guard = state.lock().unwrap();
                if let Some(child) = guard.sidecar_child.take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running clarc");
}

fn build_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let show = MenuItem::with_id(app, "show", "Show clarc", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                // Kill sidecar before exiting
                let state = app.state::<Mutex<AppState>>();
                let mut guard = state.lock().unwrap();
                if let Some(child) = guard.sidecar_child.take() {
                    let _ = child.kill();
                }
                drop(guard);
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
