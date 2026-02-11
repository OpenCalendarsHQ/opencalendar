"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function AccountTab() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Account informatie</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <p className="text-sm text-foreground mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Account aangemaakt</label>
              <p className="text-sm text-foreground mt-1">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                }) : "-"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Laatst ingelogd</label>
              <p className="text-sm text-foreground mt-1">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }) : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4">Authenticatie methode</h2>
          <div className="flex items-center gap-3">
            {user?.app_metadata?.provider === "google" ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <GoogleIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Google</p>
                  <p className="text-xs text-muted-foreground">Ingelogd via Google account</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email & Wachtwoord</p>
                  <p className="text-xs text-muted-foreground">Standaard authenticatie</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Meer account instellingen komen binnenkort beschikbaar, zoals wachtwoord wijzigen en account verwijderen.
          </p>
        </div>
      </div>
    </div>
  );
}
