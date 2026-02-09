import { useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const { user, isAuthenticated, isLoading, logout, login } = useAuth();

  // Listen for deep link events
  useEffect(() => {
    const unlisten = listen<string[]>("deep-link://new-url", (event) => {
      const urls = event.payload;
      console.log("Deep link received in frontend:", urls);

      // Parse the URL: opencalendar://auth-callback?token=...&refresh_token=...&user_id=...&email=...
      if (urls && urls.length > 0) {
        const url = urls[0];
        console.log("Processing deep link URL:", url);

        if (url.includes("auth-callback")) {
          try {
            // Handle both with and without trailing slash: auth-callback/ or auth-callback
            const urlObj = new URL(url.replace("auth-callback/", "auth-callback"));
            console.log("Parsed URL:", urlObj.toString());

            const token = urlObj.searchParams.get("token");
            const refreshToken = urlObj.searchParams.get("refresh_token");
            const userId = urlObj.searchParams.get("user_id");
            const email = urlObj.searchParams.get("email");
            const name = urlObj.searchParams.get("name");
            const image = urlObj.searchParams.get("image");

            console.log("Deep link params:", { token: token?.substring(0, 20) + "...", refreshToken: refreshToken?.substring(0, 20) + "...", userId, email, name });

            if (token && refreshToken && userId && email) {
              console.log("Logging in with deep link credentials...");
              login(
                { token, refreshToken },
                { id: userId, email, name: name || undefined, image: image || undefined }
              );
            } else {
              console.error("Missing required parameters in deep link");
            }
          } catch (error) {
            console.error("Failed to parse deep link:", error);
          }
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [login]);

  async function handleLogin() {
    try {
      // Use Tauri's opener plugin to open the browser
      await invoke("plugin:opener|open_url", {
        url: `${API_URL}/auth/desktop-login`
      });
    } catch (error) {
      console.error("Failed to open browser:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-lg">OpenCalendar wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">OpenCalendar</h1>
          <p className="text-neutral-600 mb-6 text-sm">Log in om je agenda's te bekijken</p>
          <button
            onClick={handleLogin}
            className="w-full bg-neutral-900 text-white font-medium py-2.5 px-4 rounded-md hover:bg-neutral-800 transition-colors"
          >
            Inloggen met Browser
          </button>
          <p className="mt-4 text-xs text-neutral-500 text-center">
            Er wordt een browser geopend voor authenticatie
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">OpenCalendar</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Uitloggen
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welkom! 👋</h2>
          <p className="text-gray-600">De calendar view komt zo...</p>
        </div>
      </div>
    </div>
  );
}

export default App;
