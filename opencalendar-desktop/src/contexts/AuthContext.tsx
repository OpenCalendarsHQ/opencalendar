import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "../lib/api";
import type { User, AuthTokens } from "../lib/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 25 minutes (tokens expire in 30 days, but we refresh often for safety)
    const interval = setInterval(() => {
      refreshAccessToken().catch((error) => {
        console.error("Failed to refresh token:", error);
        logout();
      });
    }, 25 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  async function loadStoredAuth() {
    try {
      const token = await invoke<string | null>("get_token");
      const refreshToken = await invoke<string | null>("get_refresh_token");
      const userJson = await invoke<string | null>("get_user");

      if (token && refreshToken && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        api.setToken(token);
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(tokens: AuthTokens, userData: User) {
    try {
      // Store tokens in Tauri backend
      await invoke("set_tokens", {
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken,
        userData: JSON.stringify(userData),
      });

      // Update state
      setUser(userData);
      api.setToken(tokens.token);
    } catch (error) {
      console.error("Failed to store auth:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await invoke("clear_tokens");
      setUser(null);
      api.setToken(null);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  async function refreshAccessToken() {
    try {
      const refreshToken = await invoke<string | null>("get_refresh_token");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.refreshToken(refreshToken);

      // Store new access token
      await invoke("set_tokens", {
        accessToken: response.token,
        refreshToken: refreshToken,
        userData: JSON.stringify({
          id: response.userId,
          email: response.email,
        }),
      });

      api.setToken(response.token);
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
