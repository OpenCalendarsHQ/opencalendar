"use client";

import { useContext } from "react";
import { Toaster } from "sonner";
import { SettingsContext } from "@/lib/settings-context";

export function ToastProvider() {
  // Use context directly to avoid throwing when SettingsProvider is not available (e.g. on /welcome)
  const context = useContext(SettingsContext);
  const theme = context?.settings?.theme === "auto" ? "system" : (context?.settings?.theme ?? "system");

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}
