use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager, State};

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
