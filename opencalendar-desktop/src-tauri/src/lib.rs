use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthTokens {
    access_token: Option<String>,
    refresh_token: Option<String>,
    user_data: Option<String>,
}

struct AppState {
    tokens: Mutex<AuthTokens>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            tokens: Mutex::new(AuthTokens {
                access_token: None,
                refresh_token: None,
                user_data: None,
            }),
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
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
