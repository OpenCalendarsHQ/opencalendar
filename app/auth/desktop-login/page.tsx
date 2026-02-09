"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DesktopLoginPage() {
  const router = useRouter();
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
          window.location.href = "/api/auth/desktop-token";
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
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Laden...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 shadow-sm p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Authenticating...
          </h1>
          <p className="text-sm text-zinc-400">
            Je wordt doorgestuurd naar de desktop app
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#111111]">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 shadow-sm p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-2">
            OpenCalendar Desktop
          </h1>
          <p className="text-sm text-zinc-400">
            Log in om je desktop app te koppelen
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="block w-full bg-indigo-600 text-white font-medium py-2.5 px-4 rounded-md hover:bg-indigo-700 transition-colors text-center"
        >
          Inloggen
        </button>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            Na het inloggen wordt je desktop app automatisch geactiveerd
          </p>
        </div>
      </div>
    </div>
  );
}
