"use client";

import { useEffect, useContext } from "react";
import { SettingsContext } from "@/lib/settings-context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use context directly to avoid throwing error if SettingsProvider is not available
  const context = useContext(SettingsContext);
  const settings = context?.settings;

  // Apply theme class to html element and sync to localStorage
  useEffect(() => {
    // Skip if settings are not available (not in SettingsProvider context)
    if (!settings) return;

    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    if (settings.theme === "light") {
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    } else if (settings.theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      // Auto mode - detect system preference
      localStorage.setItem("theme", "auto");
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "dark" : "light");

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [settings]);

  // Apply color scheme and sync to localStorage
  useEffect(() => {
    // Skip if settings are not available (not in SettingsProvider context)
    if (!settings) return;

    const root = document.documentElement;

    // Remove existing color scheme classes
    root.classList.remove("scheme-default", "scheme-blue", "scheme-purple", "scheme-green", "scheme-orange");

    // Add new color scheme class
    root.classList.add(`scheme-${settings.colorScheme}`);
    localStorage.setItem("colorScheme", settings.colorScheme);
  }, [settings]);

  // Apply compact mode and sync to localStorage
  useEffect(() => {
    // Skip if settings are not available (not in SettingsProvider context)
    if (!settings) return;

    const root = document.documentElement;

    if (settings.compactMode) {
      root.classList.add("compact");
      localStorage.setItem("compactMode", "true");
    } else {
      root.classList.remove("compact");
      localStorage.setItem("compactMode", "false");
    }
  }, [settings]);

  return <>{children}</>;
}
