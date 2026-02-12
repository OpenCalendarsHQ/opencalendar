use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};

const AUTH_FILE: &str = "auth.json";
const APP_ID: &str = "com.arjan.opencalendar";

// Debounce voor deep links - voorkomt stack overflow door herhaalde aanroepen
static LAST_DEEP_LINK: OnceLock<Mutex<Option<(String, Instant)>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthTokens {
    access_token: Option<String>,
    refresh_token: Option<String>,
    user_data: Option<String>,
}

struct AppState {
    tokens: Mutex<AuthTokens>,
    auth_path: Mutex<Option<PathBuf>>,
}

fn app_data_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    let base = dirs::data_local_dir();
    #[cfg(not(windows))]
    let base = dirs::data_dir();
    base.map(|p| p.join(APP_ID))
}

impl AppState {
    fn new(tokens: AuthTokens, auth_path: Option<PathBuf>) -> Self {
        Self {
            tokens: Mutex::new(tokens),
            auth_path: Mutex::new(auth_path),
        }
    }

    fn load_from_disk(path: &PathBuf) -> AuthTokens {
        match fs::read_to_string(path) {
            Ok(contents) => {
                serde_json::from_str(&contents).unwrap_or_else(|_| AuthTokens {
                    access_token: None,
                    refresh_token: None,
                    user_data: None,
                })
            }
            Err(_) => AuthTokens {
                access_token: None,
                refresh_token: None,
                user_data: None,
            },
        }
    }

    fn save_to_disk(&self, tokens: &AuthTokens) {
        if let Ok(auth_path) = self.auth_path.lock() {
            if let Some(path) = auth_path.as_ref() {
                if let Some(parent) = path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                if let Ok(json) = serde_json::to_string_pretty(tokens) {
                    let _ = fs::write(path, json);
                }
            }
        }
    }

    fn clear_from_disk(&self) {
        if let Ok(auth_path) = self.auth_path.lock() {
            if let Some(path) = auth_path.as_ref() {
                let _ = fs::remove_file(path);
            }
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
    state.save_to_disk(&tokens);
    Ok(())
}

#[tauri::command]
fn clear_tokens(state: State<AppState>) -> Result<(), String> {
    let mut tokens = state.tokens.lock().unwrap();
    tokens.access_token = None;
    tokens.refresh_token = None;
    tokens.user_data = None;
    state.clear_from_disk();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // AppState: Builder::manage() zorgt dat state beschikbaar is voordat commands draaien
    let auth_path = app_data_dir().and_then(|dir| {
        fs::create_dir_all(&dir).ok();
        Some(dir.join(AUTH_FILE))
    });

    let tokens = auth_path
        .as_ref()
        .map(|p| AppState::load_from_disk(p))
        .unwrap_or_else(|| AuthTokens {
            access_token: None,
            refresh_token: None,
            user_data: None,
        });

    tauri::Builder::default()
        .manage(AppState::new(tokens, auth_path))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Focus en toon venster
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }

            // Deep link in args (van tweede instantie die door OS wordt gestart)
            for arg in args {
                if arg.starts_with("opencalendar://") {
                    // Debounce met static - voorkomt dubbele verwerking
                    let should_emit = {
                        let mutex = LAST_DEEP_LINK.get_or_init(|| Mutex::new(None));
                        if let Ok(mut guard) = mutex.lock() {
                            let now = Instant::now();
                            if let Some((ref last_url, last_time)) = *guard {
                                if last_url.as_str() == arg.as_str() && last_time.elapsed() < Duration::from_secs(2) {
                                    false
                                } else {
                                    *guard = Some((arg.clone(), now));
                                    true
                                }
                            } else {
                                *guard = Some((arg.clone(), now));
                                true
                            }
                        } else {
                            true
                        }
                    };
                    if should_emit {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("deep-link://new-url", vec![arg.clone()]);
                        }
                    }
                }
            }
        }))
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

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
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
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent the window from closing
                        api.prevent_close();
                        // Hide the window instead
                        let _ = window_clone.hide();
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
                    let url_string = event_urls.first().map(|u| u.to_string()).unwrap_or_default();
                    if url_string.is_empty() {
                        return;
                    }

                    // Debounce met static - voorkomt herhaalde verwerking en stack overflow
                    let should_emit = {
                        let mutex = LAST_DEEP_LINK.get_or_init(|| Mutex::new(None));
                        if let Ok(mut guard) = mutex.lock() {
                            let now = Instant::now();
                            if let Some((ref last_url, last_time)) = *guard {
                                if last_url == &url_string && last_time.elapsed() < Duration::from_secs(2) {
                                    false
                                } else {
                                    *guard = Some((url_string.clone(), now));
                                    true
                                }
                            } else {
                                *guard = Some((url_string.clone(), now));
                                true
                            }
                        } else {
                            true
                        }
                    };

                    if !should_emit {
                        return;
                    }

                    // Emit to frontend
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let urls: Vec<String> = event_urls.iter().map(|u| u.to_string()).collect();
                        let _ = window.emit("deep-link://new-url", urls);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
