"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export function UserButtonWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  }

  if (!user) {
    return (
      <button className="h-10 w-10 rounded-full bg-muted" aria-label="User menu" />
    );
  }

  const initials = user.email
    ?.split("@")[0]
    .substring(0, 2)
    .toUpperCase() ?? "U";

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full bg-neutral-900 text-white font-medium text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center overflow-hidden"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.email || "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-neutral-200 shadow-lg z-50">
            <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-neutral-900 text-white font-medium text-sm flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.email || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {user.user_metadata?.full_name || "OpenCalendar gebruiker"}
                </p>
              </div>
            </div>
            <div className="p-2">
              <a
                href="/settings/account"
                className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Account instellingen
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
