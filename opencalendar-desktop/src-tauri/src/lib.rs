use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthTokens {
    access_token: Option<String>,
    refresh_token: Option<String>,
    user_data: Option<String>,
}

struct AppState {
    tokens: Mutex<AuthTokens>,
    last_deep_link: Mutex<Option<(String, Instant)>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            tokens: Mutex::new(AuthTokens {
                access_token: None,
                refresh_token: None,
                user_data: None,
            }),
            last_deep_link: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn get_token(state: State<AppState>) -> Option<String> {
    state.tokens.lock().unwrap().access_token.clone()
}

#[tauri::command]
fn get_refresh_token(state: State<AppState>) -> Option<String> {
    state.tokens.lock().unwrap().refresh_token.clone()
}

#[tauri::command]
fn get_user(state: State<AppState>) -> Option<String> {
    state.tokens.lock().unwrap().user_data.clone()
}

#[tauri::command]
fn set_tokens(
    state: State<AppState>,
    access_token: String,
    refresh_token: String,
    user_data: String,
) -> Result<(), String> {
    let mut tokens = state.tokens.lock().unwrap();
    tokens.access_token = Some(access_token);
    tokens.refresh_token = Some(refresh_token);
    tokens.user_data = Some(user_data);
    Ok(())
}

#[tauri::command]
fn clear_tokens(state: State<AppState>) -> Result<(), String> {
    let mut tokens = state.tokens.lock().unwrap();
    tokens.access_token = None;
    tokens.refresh_token = None;
    tokens.user_data = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            println!("Single instance callback - args: {:?}, cwd: {:?}", args, cwd);

            // Try to focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }

            // Check if there's a deep link in the args
            for arg in args {
                if arg.starts_with("opencalendar://") {
                    println!("Deep link from new instance: {}", arg);
                    // Emit the deep link to the existing instance
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("deep-link://new-url", vec![arg.clone()]);
                    }
                }
            }
        }))
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_token,
            get_refresh_token,
            get_user,
            set_tokens,
            clear_tokens
        ])
        .setup(|app| {
            // Setup system tray
            let show_item = MenuItem::with_id(app, "show", "Tonen", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Afsluiten", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Handle window close event - minimize to tray instead of closing
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(|event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent the window from closing
                        api.prevent_close();
                        // Hide the window instead
                        if let Some(window) = event.window() {
                            let _ = window.hide();
                        }
                    }
                });
            }

            // Register deep link handler
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register("opencalendar")?;

                // Listen for deep links and emit them to the frontend
                let app_handle = app.handle().clone();

                app.deep_link().on_open_url(move |event| {
                    let event_urls = event.urls();
                    println!("Deep link received in on_open_url: {:?}", event_urls);

                    // Check for duplicate URLs within 2 seconds (debounce)
                    let url_string = event_urls.first().map(|u| u.to_string()).unwrap_or_default();

                    let state = app_handle.state::<AppState>();
                    if let Ok(mut last_link) = state.last_deep_link.lock() {
                        if let Some((last_url, last_time)) = last_link.as_ref() {
                            if last_url == &url_string && last_time.elapsed() < Duration::from_secs(2) {
                                println!("Ignoring duplicate deep link within 2 seconds");
                                return;
                            }
                        }

                        // Update the last processed link
                        *last_link = Some((url_string.clone(), Instant::now()));
                    }

                    // Emit to frontend
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let urls: Vec<String> = event_urls.iter().map(|u| u.to_string()).collect();
                        println!("Emitting deep-link event to frontend with {} URLs", urls.len());
                        if let Err(e) = window.emit("deep-link://new-url", urls) {
                            eprintln!("Failed to emit deep link event: {}", e);
                        } else {
                            println!("Successfully emitted deep-link event");
                        }
                    } else {
                        eprintln!("Could not find main window to emit deep link");
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
