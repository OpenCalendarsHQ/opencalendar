"use client";

import { AuthUIProvider } from "@neondatabase/auth/react";
// Auth UI styles are imported in globals.css via @import "@neondatabase/auth/ui/tailwind"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { SettingsProvider } from "@/lib/settings-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient as never}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={router.refresh}
      Link={Link}
      redirectTo="/"
      social={{
        providers: ["google"],
      }}
      credentials={{
        forgotPassword: true,
      }}
    >
      <SettingsProvider>{children}</SettingsProvider>
    </AuthUIProvider>
  );
}
