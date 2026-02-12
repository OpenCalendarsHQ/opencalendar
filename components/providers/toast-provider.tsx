"use client";

import { Toaster } from "sonner";
import { useSettings } from "@/lib/settings-context";

export function ToastProvider() {
  const { settings } = useSettings();

  return (
    <Toaster
      theme={settings.theme === "auto" ? "system" : settings.theme}
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
