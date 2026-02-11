"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function DesktopLoginPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);

      // If logged in, redirect to token generation
      if (user && !isRedirecting) {
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = "/auth/desktop-token";
        }, 500);
      }
    });
  }, [supabase, isRedirecting]);

  function handleLogin() {
    // Redirect to sign-in with return URL
    router.push("/auth/sign-in?redirectTo=/auth/desktop-login");
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="font-pixel text-3xl font-bold text-white mb-2">
            {t("desktopLoginTitle")}
          </h1>
          <p className="text-zinc-400">{t("loading")}</p>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="font-pixel text-3xl font-bold text-white mb-2">
            {t("authenticating")}
          </h1>
          <p className="text-zinc-400">{t("desktopLoginSubtitle")}</p>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="font-pixel text-3xl font-bold text-white mb-2">
          {t("desktopLoginTitle")}
        </h1>
        <p className="text-zinc-400">{t("desktopLoginSubtitle")}</p>
      </div>

      <button
        onClick={handleLogin}
        className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t("signInButton")}
      </button>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 text-center">
          {t("desktopLoginInfo")}
        </p>
      </div>
    </div>
  );
}
