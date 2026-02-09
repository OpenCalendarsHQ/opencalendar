"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Palette,
  Bell,
  Globe,
  Shield,
  ChevronRight,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Loader2,
  CheckSquare,
} from "lucide-react";

// Inline Apple SVG icon
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

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

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00a4ef" />
    </svg>
  );
}

interface ConnectedAccount {
  id: string;
  provider: "google" | "icloud" | "microsoft";
  email: string;
  lastSyncAt: string | null;
  status: "active" | "error";
  calendarCount: number;
}

const settingsItems = [
  { href: "/settings/account", icon: Shield, title: "Account & Beveiliging", description: "Wachtwoord, 2FA en sessies" },
  { href: "/settings/appearance", icon: Palette, title: "Weergave", description: "Startdag, tijdformaat, weeknummers" },
  { href: "/settings/region", icon: Globe, title: "Taal & regio", description: "Tijdzone en datumnotatie" },
  { href: "/settings/tasks", icon: CheckSquare, title: "Taken integraties", description: "Notion en GitHub verbinden" },
];

const comingSoonItems = [
  { icon: Bell, title: "Meldingen", description: "Herinneringen en notificaties" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [showICloudModal, setShowICloudModal] = useState(false);
  const [iCloudEmail, setICloudEmail] = useState("");
  const [iCloudPassword, setICloudPassword] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAccounts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch("/api/calendars");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAccounts(
            data
              .filter((g: Record<string, unknown>) => g.provider !== "local")
              .map((g: Record<string, unknown>) => ({
                id: g.id as string,
                provider: g.provider as "google" | "icloud" | "microsoft",
                email: g.email as string,
                lastSyncAt: g.lastSyncAt as string | null,
                status: "active" as const,
                calendarCount: Array.isArray(g.calendars) ? g.calendars.length : 0,
              }))
          );
        }
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Check for syncing flag or connected flag in URL
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const syncing = params.get('syncing');

    if (syncing === 'true' || connected) {
      // Show success message
      if (connected === 'google') {
        setSuccess('Google Calendar succesvol verbonden - synchronisatie loopt...');
      } else if (connected === 'microsoft') {
        setSuccess('Microsoft Calendar succesvol verbonden - synchronisatie loopt...');
      } else if (syncing === 'true') {
        setSuccess('Account verbonden - synchronisatie loopt...');
      }

      // Poll for updates while syncing (without showing loading spinner)
      const interval = setInterval(() => {
        fetchAccounts(false);
      }, 2000); // Refresh every 2 seconds

      // Stop polling and clear message after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        setSuccess(null);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  const handleConnectGoogle = () => {
    window.location.href = "/api/sync/google?action=connect";
  };

  const handleConnectMicrosoft = () => {
    window.location.href = "/api/sync/microsoft?action=connect";
  };

  const handleConnectICloud = async () => {
    if (!iCloudEmail || !iCloudPassword) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/icloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", email: iCloudEmail, appPassword: iCloudPassword }),
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch {
        setError("Onverwacht antwoord van de server.");
        return;
      }
      if (res.ok) {
        // Close modal and refresh accounts
        setShowICloudModal(false);
        setICloudEmail("");
        setICloudPassword("");
        // Start polling for updates
        window.history.replaceState(null, "", "/settings?syncing=true");
        const interval = setInterval(() => {
          fetchAccounts(false);
        }, 2000);
        setTimeout(() => clearInterval(interval), 30000);
      } else {
        setError((data.error as string) || "Verbinding mislukt.");
      }
    } catch {
      setError("Netwerkfout.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDelete = async (accountId: string, email: string) => {
    if (!confirm(`Weet je zeker dat je "${email}" wilt verwijderen? Alle kalenders en events van dit account worden ook verwijderd.`)) {
      return;
    }
    setIsDeleting(accountId);
    try {
      const res = await fetch(`/api/calendars?accountId=${accountId}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as Record<string, string>).error || "Verwijderen mislukt.");
      }
    } catch {
      setError("Netwerkfout bij verwijderen.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSync = async (accountId: string, provider: string) => {
    setIsSyncing(accountId);
    setError(null);
    try {
      let endpoint = "/api/sync/icloud";
      if (provider === "google") {
        endpoint = "/api/sync/google";
      } else if (provider === "microsoft") {
        endpoint = "/api/sync/microsoft/callback";
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", accountId }),
      });

      if (res.ok) {
        await fetchAccounts();
      } else if (res.status === 401) {
        // Invalid credentials error
        const data = await res.json().catch(() => ({}));
        const errorData = data as { error?: string; message?: string };
        if (errorData.error === "invalid_credentials") {
          setError(errorData.message || "Je inloggegevens zijn verlopen. Verwijder het account en voeg het opnieuw toe.");
        } else {
          setError("Authenticatie mislukt. Probeer opnieuw in te loggen.");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Synchronisatie mislukt.");
      }
    } catch {
      setError("Netwerkfout tijdens synchronisatie.");
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">Instellingen</h1>
          <p className="text-xs text-muted-foreground">Beheer je voorkeuren</p>
        </div>
      </div>

      {/* === Verbonden accounts sectie === */}
      <section className="mb-8">
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Verbonden accounts
        </h2>

        {error && (
          <div className="mb-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Sluiten</button>
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs text-success flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="min-h-[120px]">
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="h-8 w-8 rounded-md bg-muted" />
                    <div className="h-8 w-8 rounded-md bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">Geen accounts verbonden</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Voeg een account toe om te synchroniseren.</p>
            </div>
          ) : (
          <div className="space-y-1">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    {account.provider === "icloud" ? (
                      <AppleIcon className="h-4 w-4 text-foreground" />
                    ) : account.provider === "microsoft" ? (
                      <MicrosoftIcon className="h-4 w-4" />
                    ) : (
                      <GoogleIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <span className="truncate">{account.email}</span>
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {account.provider === "google" ? "Google Calendar" : account.provider === "microsoft" ? "Microsoft Calendar" : "iCloud Calendar"}
                      {account.calendarCount > 0 && ` · ${account.calendarCount} kalender${account.calendarCount !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleSync(account.id, account.provider)}
                    disabled={isSyncing === account.id}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    title="Synchroniseren"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing === account.id ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id, account.email)}
                    disabled={isDeleting === account.id}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                    title="Verwijder"
                  >
                    {isDeleting === account.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Account toevoegen */}
        <div className="mt-3">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <button onClick={handleConnectGoogle}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <GoogleIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">Google Calendar</div>
                <div className="text-[11px] text-muted-foreground">OAuth sync</div>
              </div>
            </button>
            <button onClick={handleConnectMicrosoft}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <MicrosoftIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">Microsoft Calendar</div>
                <div className="text-[11px] text-muted-foreground">OAuth sync</div>
              </div>
            </button>
            <button onClick={() => { setShowICloudModal(true); setError(null); }}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <AppleIcon className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">iCloud Calendar</div>
                <div className="text-[11px] text-muted-foreground">App-wachtwoord</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* === Overige instellingen === */}
      <section className="mb-8">
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Voorkeuren
        </h2>
        <div className="space-y-px">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* === Binnenkort === */}
      <section>
        <h2 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Binnenkort
        </h2>
        <div className="space-y-px">
          {comingSoonItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title}
                className="flex items-center gap-3 rounded-lg px-3 py-3 opacity-40">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    {item.title}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">Binnenkort</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* iCloud Modal */}
      {showICloudModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowICloudModal(false)} />
          <div className="relative w-full max-w-sm rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
            <h2 className="text-sm font-medium text-foreground">iCloud Calendar verbinden</h2>
            <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Hoe krijg ik een app-wachtwoord?</p>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Ga naar <a href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer"
                  className="text-foreground underline hover:text-foreground/80">account.apple.com</a></li>
                <li>Log in met je Apple ID</li>
                <li>Ga naar &quot;Beveiliging&quot; → &quot;App-specifieke wachtwoorden&quot;</li>
                <li>Genereer een nieuw wachtwoord voor &quot;OpenCalendar&quot;</li>
              </ol>
            </div>
            {error && (
              <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>
            )}
            <div className="mt-4 space-y-2.5">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Apple ID</label>
                <input type="email" value={iCloudEmail} onChange={(e) => setICloudEmail(e.target.value)}
                  placeholder="jouwemail@icloud.com"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">App-wachtwoord</label>
                <input type="password" value={iCloudPassword} onChange={(e) => setICloudPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowICloudModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
                Annuleren
              </button>
              <button onClick={handleConnectICloud}
                disabled={!iCloudEmail || !iCloudPassword || isConnecting}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50">
                {isConnecting && <Loader2 className="h-3 w-3 animate-spin" />}
                {isConnecting ? "Verbinden..." : "Verbinden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
