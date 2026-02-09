"use client";

import { SettingsProvider } from "@/lib/settings-context";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SettingsProvider>
  );
}
