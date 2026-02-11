"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function DesktopTokenPage() {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState(t("generatingTokens"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function authenticate() {
      try {
        // Call POST endpoint to get JWT tokens
        const response = await fetch("/auth/api/desktop-token", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to generate tokens");
        }

        const data = await response.json();

        // Redirect to desktop app with tokens
        const redirectUrl = new URL("opencalendar://auth-callback");
        redirectUrl.searchParams.set("token", data.token);
        redirectUrl.searchParams.set("refresh_token", data.refreshToken);
        redirectUrl.searchParams.set("user_id", data.userId);
        redirectUrl.searchParams.set("email", data.email || "");
        if (data.name) redirectUrl.searchParams.set("name", data.name);
        if (data.image) redirectUrl.searchParams.set("image", data.image);

        setStatus(t("redirectingToApp"));

        // Try to redirect
        window.location.href = redirectUrl.toString();

        // Show success message after 2 seconds if redirect didn't work
        setTimeout(() => {
          setStatus(t("redirectFailed"));
        }, 2000);
      } catch (err) {
        console.error("Auth error:", err);
        setError(t("authenticationFailed"));
      }
    }

    authenticate();
  }, [t]);

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="font-pixel text-3xl font-bold text-white mb-2">
            {t("authenticating")}
          </h1>
          <p className="text-zinc-400">{t("desktopLoginSubtitle")}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-pixel text-3xl font-bold text-white mb-2">
          {t("authenticating")}
        </h1>
        <p className="text-zinc-400">{status}</p>
      </div>
      <div className="flex justify-center py-8">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
