"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DesktopLoginPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">
            Authenticating...
          </h1>
          <p className="text-sm text-neutral-600">
            Je wordt doorgestuurd naar de desktop app
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            OpenCalendar Desktop
          </h1>
          <p className="text-sm text-neutral-600">
            Log in om je desktop app te koppelen
          </p>
        </div>

        <a
          href="/auth/sign-in"
          className="block w-full bg-neutral-900 text-white font-medium py-2.5 px-4 rounded-md hover:bg-neutral-800 transition-colors text-center"
        >
          Inloggen
        </a>

        <div className="mt-6 pt-6 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">
            Na het inloggen wordt je desktop app automatisch geactiveerd
          </p>
        </div>
      </div>
    </div>
  );
}
