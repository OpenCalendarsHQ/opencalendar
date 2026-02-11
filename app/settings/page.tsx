"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Calendar as CalendarIcon,
  Monitor,
  Check,
  Settings,
} from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useSettings } from "@/lib/settings-context";

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

function CalDAVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
  );
}

interface ConnectedAccount {
  id: string;
  provider: "google" | "icloud" | "microsoft" | "caldav";
  email: string;
  lastSyncAt: string | null;
  status: "active" | "error";
  calendarCount: number;
}

type TabType = "calendars" | "account" | "appearance" | "region" | "tasks";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("calendars");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [showICloudModal, setShowICloudModal] = useState(false);
  const [iCloudEmail, setICloudEmail] = useState("");
  const [iCloudPassword, setICloudPassword] = useState("");
  const [showCalDAVModal, setShowCalDAVModal] = useState(false);
  const [caldavServerUrl, setCaldavServerUrl] = useState("");
  const [caldavUsername, setCaldavUsername] = useState("");
  const [caldavPassword, setCaldavPassword] = useState("");
  const [caldavEmail, setCaldavEmail] = useState("");
  const [showLocalCalendarModal, setShowLocalCalendarModal] = useState(false);
  const [localCalendarName, setLocalCalendarName] = useState("");
  const [localCalendarColor, setLocalCalendarColor] = useState("#3b82f6");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: "calendars" as TabType, label: t("tabs.calendars"), icon: CalendarIcon },
    { id: "account" as TabType, label: t("tabs.account"), icon: Shield },
    { id: "appearance" as TabType, label: t("tabs.appearance"), icon: Palette },
    { id: "region" as TabType, label: t("tabs.region"), icon: Globe },
    { id: "tasks" as TabType, label: t("tabs.tasks"), icon: CheckSquare },
  ];

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
                provider: g.provider as "google" | "icloud" | "microsoft" | "caldav",
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

  const handleConnectCalDAV = async () => {
    if (!caldavServerUrl || !caldavUsername || !caldavEmail || !caldavPassword) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/caldav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          serverUrl: caldavServerUrl,
          username: caldavUsername,
          email: caldavEmail,
          password: caldavPassword,
        }),
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch {
        setError("Onverwacht antwoord van de server.");
        return;
      }
      if (res.ok) {
        // Close modal and reset fields
        setShowCalDAVModal(false);
        setCaldavServerUrl("");
        setCaldavUsername("");
        setCaldavEmail("");
        setCaldavPassword("");
        // Start polling for updates
        window.history.replaceState(null, "", "/settings?syncing=true");
        setSuccess("CalDAV account verbonden - synchronisatie loopt...");
        const interval = setInterval(() => {
          fetchAccounts(false);
        }, 2000);
        setTimeout(() => {
          clearInterval(interval);
          setSuccess(null);
        }, 30000);
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

  const handleCreateLocalCalendar = async () => {
    if (!localCalendarName.trim()) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: localCalendarName.trim(),
          color: localCalendarColor,
        }),
      });

      if (res.ok) {
        setShowLocalCalendarModal(false);
        setLocalCalendarName("");
        setLocalCalendarColor("#3b82f6");
        setSuccess("Lokale kalender aangemaakt!");
        await fetchAccounts();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Kon kalender niet aanmaken");
      }
    } catch {
      setError("Netwerkfout bij aanmaken kalender");
    } finally {
      setIsConnecting(false);
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
      } else if (provider === "caldav") {
        endpoint = "/api/sync/caldav";
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
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Kalender accounts tab */}
        {activeTab === "calendars" && (
          <div>
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

            <div className="mb-4">
              <h2 className="mb-2 text-sm font-medium text-foreground">Verbonden accounts</h2>
              <p className="text-xs text-muted-foreground">
                Synchroniseer je kalenders met Google, Microsoft of iCloud
              </p>
            </div>

            <div>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-3 animate-pulse">
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
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-xs text-muted-foreground">Geen accounts verbonden</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Voeg een account toe om te synchroniseren</p>
                </div>
              ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        {account.provider === "icloud" ? (
                          <AppleIcon className="h-4 w-4 text-foreground" />
                        ) : account.provider === "microsoft" ? (
                          <MicrosoftIcon className="h-4 w-4" />
                        ) : account.provider === "caldav" ? (
                          <CalDAVIcon className="h-4 w-4 text-foreground" />
                        ) : (
                          <GoogleIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <span className="truncate">{account.email}</span>
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.provider === "google" ? "Google Calendar" : account.provider === "microsoft" ? "Microsoft Calendar" : account.provider === "caldav" ? "CalDAV" : "iCloud Calendar"}
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
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Account toevoegen</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button onClick={handleConnectGoogle}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-left hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <GoogleIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Google</div>
                    <div className="text-[10px] text-muted-foreground">OAuth sync</div>
                  </div>
                </button>
                <button onClick={handleConnectMicrosoft}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-left hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <MicrosoftIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Microsoft</div>
                    <div className="text-[10px] text-muted-foreground">OAuth sync</div>
                  </div>
                </button>
                <button onClick={() => { setShowICloudModal(true); setError(null); }}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-left hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <AppleIcon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">iCloud</div>
                    <div className="text-[10px] text-muted-foreground">App-wachtwoord</div>
                  </div>
                </button>
                <button onClick={() => { setShowCalDAVModal(true); setError(null); }}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 text-left hover:bg-muted">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <CalDAVIcon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">CalDAV</div>
                    <div className="text-[10px] text-muted-foreground">Nextcloud, Fastmail...</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Lokale kalenders sectie */}
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Lokale kalenders</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Lokale kalenders worden in de database opgeslagen en synchroniseren tussen je apparaten, maar zijn niet verbonden met externe diensten.
              </p>
              <button
                onClick={() => setShowLocalCalendarModal(true)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-3 text-left hover:bg-muted"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Monitor className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">Lokale kalender toevoegen</div>
                  <div className="text-[10px] text-muted-foreground">Blijft op dit apparaat</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Account tab */}
        {activeTab === "account" && <AccountTab />}

        {/* Weergave tab */}
        {activeTab === "appearance" && <AppearanceTab />}

        {/* Taal & regio tab */}
        {activeTab === "region" && <RegionTab />}

        {/* Taken tab */}
        {activeTab === "tasks" && <TasksTab />}
      </div>

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

      {/* CalDAV Modal */}
      {showCalDAVModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowCalDAVModal(false)} />
          <div className="relative w-full max-w-md rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
            <h2 className="text-sm font-medium text-foreground">CalDAV account verbinden</h2>

            {error && (
              <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>
            )}

            <div className="mt-4 space-y-2.5">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Server URL</label>
                <input
                  type="url"
                  value={caldavServerUrl}
                  onChange={(e) => setCaldavServerUrl(e.target.value)}
                  placeholder="https://nextcloud.example.com/remote.php/dav"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email (voor display)</label>
                <input
                  type="email"
                  value={caldavEmail}
                  onChange={(e) => setCaldavEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Username</label>
                <input
                  type="text"
                  value={caldavUsername}
                  onChange={(e) => setCaldavUsername(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Wachtwoord</label>
                <input
                  type="password"
                  value={caldavPassword}
                  onChange={(e) => setCaldavPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Veelgebruikte server URLs:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Nextcloud: https://your-domain.com/remote.php/dav</li>
                <li>Fastmail: https://caldav.fastmail.com/dav/calendars/user/email@fastmail.com/</li>
                <li>Zoho: https://caldav.zoho.com</li>
              </ul>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCalDAVModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
                Annuleren
              </button>
              <button onClick={handleConnectCalDAV}
                disabled={!caldavServerUrl || !caldavUsername || !caldavEmail || !caldavPassword || isConnecting}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50">
                {isConnecting && <Loader2 className="h-3 w-3 animate-spin" />}
                {isConnecting ? "Verbinden..." : "Verbinden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Calendar Modal */}
      {showLocalCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowLocalCalendarModal(false)} />
          <div className="relative w-full max-w-sm rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
            <h2 className="text-sm font-medium text-foreground">Lokale kalender aanmaken</h2>

            {error && (
              <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Naam</label>
                <input
                  type="text"
                  value={localCalendarName}
                  onChange={(e) => setLocalCalendarName(e.target.value)}
                  placeholder="Persoonlijk, Werk, Familie..."
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Kleur</label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 shrink-0 rounded-lg border border-border cursor-pointer"
                    style={{ backgroundColor: localCalendarColor }}
                    onClick={() => {
                      const picker = document.getElementById("local-calendar-color-picker");
                      if (picker) {
                        picker.style.display = picker.style.display === "none" ? "block" : "none";
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{localCalendarColor}</span>
                </div>
                <div id="local-calendar-color-picker" style={{ display: "none" }} className="mt-2">
                  <ColorPicker
                    value={localCalendarColor}
                    onChange={(color) => {
                      setLocalCalendarColor(color);
                      const picker = document.getElementById("local-calendar-color-picker");
                      if (picker) picker.style.display = "none";
                    }}
                    onClose={() => {
                      const picker = document.getElementById("local-calendar-color-picker");
                      if (picker) picker.style.display = "none";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLocalCalendarModal(false)}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
                Annuleren
              </button>
              <button onClick={handleCreateLocalCalendar}
                disabled={!localCalendarName.trim() || isConnecting}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50">
                {isConnecting && <Loader2 className="h-3 w-3 animate-spin" />}
                {isConnecting ? "Aanmaken..." : "Aanmaken"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENT: Account Tab
// ============================================
function AccountTab() {
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

// ============================================
// COMPONENT: Appearance Tab
// ============================================
function AppearanceTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-6">
      {/* Theme */}
      <SettingSection title="Thema" description="Kies tussen licht, donker of automatisch op basis van systeem">
        <div className="flex gap-2">
          {([
            { value: "light" as const, label: "Licht" },
            { value: "dark" as const, label: "Donker" },
            { value: "auto" as const, label: "Automatisch" },
          ]).map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={settings.theme === opt.value}
              onClick={() => updateSettings({ theme: opt.value })}
            />
          ))}
        </div>
      </SettingSection>

      {/* Color scheme */}
      <SettingSection title="Kleurenschema" description="Kies een kleurthema voor de app">
        <div className="flex gap-2">
          {([
            { value: "default" as const, label: "Standaard" },
            { value: "blue" as const, label: "Blauw" },
            { value: "purple" as const, label: "Paars" },
            { value: "green" as const, label: "Groen" },
            { value: "orange" as const, label: "Oranje" },
          ]).map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={settings.colorScheme === opt.value}
              onClick={() => updateSettings({ colorScheme: opt.value })}
            />
          ))}
        </div>
      </SettingSection>

      {/* Compact mode */}
      <SettingSection title="Compacte modus" description="Dichtere UI voor meer informatie op het scherm">
        <ToggleSwitch
          checked={settings.compactMode}
          onChange={(checked) => updateSettings({ compactMode: checked })}
        />
      </SettingSection>

      {/* First day of week */}
      <SettingSection title="Eerste dag van de week" description="Kies of de week begint op maandag of zondag">
        <div className="flex gap-2">
          <OptionButton
            label="Maandag"
            selected={settings.weekStartsOn === 1}
            onClick={() => updateSettings({ weekStartsOn: 1 })}
          />
          <OptionButton
            label="Zondag"
            selected={settings.weekStartsOn === 0}
            onClick={() => updateSettings({ weekStartsOn: 0 })}
          />
        </div>
      </SettingSection>

      {/* Time format */}
      <SettingSection title="Tijdformaat" description="Kies 24-uurs of 12-uurs weergave">
        <div className="flex gap-2">
          <OptionButton
            label="24 uur (14:00)"
            selected={settings.timeFormat === "24h"}
            onClick={() => updateSettings({ timeFormat: "24h" })}
          />
          <OptionButton
            label="12 uur (2:00 PM)"
            selected={settings.timeFormat === "12h"}
            onClick={() => updateSettings({ timeFormat: "12h" })}
          />
        </div>
      </SettingSection>

      {/* Default view */}
      <SettingSection title="Standaard weergave" description="De weergave die je ziet bij het openen van de app">
        <div className="flex gap-2">
          {([
            { value: "day" as const, label: "Dag" },
            { value: "week" as const, label: "Week" },
            { value: "month" as const, label: "Maand" },
          ]).map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={settings.defaultView === opt.value}
              onClick={() => updateSettings({ defaultView: opt.value })}
            />
          ))}
        </div>
      </SettingSection>

      {/* Week numbers */}
      <SettingSection title="Weeknummers" description="Toon weeknummers in de kalender">
        <ToggleSwitch
          checked={settings.showWeekNumbers}
          onChange={(checked) => updateSettings({ showWeekNumbers: checked })}
        />
      </SettingSection>

      {/* Default event duration */}
      <SettingSection title="Standaard afspraakduur" description="Standaardduur voor nieuwe afspraken">
        <div className="flex flex-wrap gap-2">
          {([
            { value: 30 as const, label: "30 min" },
            { value: 60 as const, label: "1 uur" },
            { value: 90 as const, label: "1,5 uur" },
            { value: 120 as const, label: "2 uur" },
          ]).map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={settings.defaultEventDuration === opt.value}
              onClick={() => updateSettings({ defaultEventDuration: opt.value })}
            />
          ))}
        </div>
      </SettingSection>

      {/* Show declined events */}
      <SettingSection title="Afgewezen afspraken" description="Toon afspraken die je hebt afgewezen">
        <ToggleSwitch
          checked={settings.showDeclinedEvents}
          onChange={(checked) => updateSettings({ showDeclinedEvents: checked })}
        />
      </SettingSection>

      {/* Working hours */}
      <SettingSection title="Werkuren highlighten" description="Markeer werkuren in dag- en weekweergave">
        <ToggleSwitch
          checked={settings.showWorkingHours}
          onChange={(checked) => updateSettings({ showWorkingHours: checked })}
        />
      </SettingSection>

      {/* Working hours range */}
      {settings.showWorkingHours && (
        <SettingSection title="Werkuren tijden" description="Begin en einde van werkuren">
          <div className="flex items-center gap-3">
            <select
              value={settings.workingHoursStart}
              onChange={(e) => updateSettings({ workingHoursStart: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">tot</span>
            <select
              value={settings.workingHoursEnd}
              onChange={(e) => updateSettings({ workingHoursEnd: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </SettingSection>
      )}

      {/* Day start/end hours */}
      <SettingSection title="Begin/eind van de dag" description="Eerste en laatste uur in dagweergave">
        <div className="flex items-center gap-3">
          <select
            value={settings.dayStartHour}
            onChange={(e) => updateSettings({ dayStartHour: parseInt(e.target.value) })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">tot</span>
          <select
            value={settings.dayEndHour}
            onChange={(e) => updateSettings({ dayEndHour: parseInt(e.target.value) })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </SettingSection>

      {/* Time slot interval */}
      <SettingSection title="Tijdslot interval" description="Grootte van tijdslots in de weergave">
        <div className="flex gap-2">
          {([
            { value: 15 as const, label: "15 min" },
            { value: 30 as const, label: "30 min" },
            { value: 60 as const, label: "60 min" },
          ]).map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={settings.timeSlotInterval === opt.value}
              onClick={() => updateSettings({ timeSlotInterval: opt.value })}
            />
          ))}
        </div>
      </SettingSection>

      {/* Show weekends */}
      <SettingSection title="Weekenden tonen" description="Toon zaterdag en zondag in weekweergave">
        <ToggleSwitch
          checked={settings.showWeekends}
          onChange={(checked) => updateSettings({ showWeekends: checked })}
        />
      </SettingSection>

      {/* Event color source */}
      <SettingSection title="Event kleuren" description="Gebruik kalender- of event-kleur">
        <div className="flex gap-2">
          <OptionButton
            label="Van kalender"
            selected={settings.eventColorSource === "calendar"}
            onClick={() => updateSettings({ eventColorSource: "calendar" })}
          />
          <OptionButton
            label="Van event zelf"
            selected={settings.eventColorSource === "event"}
            onClick={() => updateSettings({ eventColorSource: "event" })}
          />
        </div>
      </SettingSection>

      {/* Show mini calendar */}
      <SettingSection title="Mini kalender" description="Toon mini maandkalender in sidebar">
        <ToggleSwitch
          checked={settings.showMiniCalendar}
          onChange={(checked) => updateSettings({ showMiniCalendar: checked })}
        />
      </SettingSection>
    </div>
  );
}

// ============================================
// COMPONENT: Region Tab
// ============================================
const COMMON_TIMEZONES = [
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/London", label: "Londen (GMT)" },
  { value: "Europe/Berlin", label: "Berlijn (CET)" },
  { value: "Europe/Paris", label: "Parijs (CET)" },
  { value: "Europe/Brussels", label: "Brussel (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Zurich", label: "Zürich (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

function RegionTab() {
  const { settings, updateSettings } = useSettings();
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-6">
      {/* Language switcher */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-foreground">Taal</h3>
          <p className="text-xs text-muted-foreground">Kies de taal van de app</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSettings({ language: "nl" })}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
              settings.language === "nl"
                ? "border-foreground bg-foreground/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <span>Nederlands</span>
            {settings.language === "nl" && (
              <div className="h-2 w-2 rounded-full bg-foreground" />
            )}
          </button>
          <button
            onClick={() => updateSettings({ language: "en" })}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
              settings.language === "en"
                ? "border-foreground bg-foreground/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <span>English</span>
            {settings.language === "en" && (
              <div className="h-2 w-2 rounded-full bg-foreground" />
            )}
          </button>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground italic">
          * De pagina wordt herladen om de taal te wijzigen.
        </p>
      </div>

      {/* Timezone */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-foreground">Tijdzone</h3>
          <p className="text-xs text-muted-foreground">
            Je systeem detecteert: <span className="font-medium text-foreground">{detectedTimezone}</span>
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => updateSettings({ timezone: detectedTimezone })}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
              settings.timezone === detectedTimezone
                ? "border-foreground bg-foreground/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <span>Automatisch ({detectedTimezone})</span>
            {settings.timezone === detectedTimezone && (
              <div className="h-2 w-2 rounded-full bg-foreground" />
            )}
          </button>

          <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border border-border p-1">
            {COMMON_TIMEZONES.map((tz) => (
              <button
                key={tz.value}
                onClick={() => updateSettings({ timezone: tz.value })}
                className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs ${
                  settings.timezone === tz.value
                    ? "bg-foreground/5 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tz.label}</span>
                {settings.timezone === tz.value && (
                  <div className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Tasks Tab
// ============================================
interface TaskProvider {
  id: string;
  provider: "notion" | "github" | "manual";
  name: string;
  lastSyncAt: string | null;
  isActive: boolean;
  providerData: any;
}

interface GitHubRepo {
  fullName: string;
  name: string;
  description?: string;
}

interface NotionDatabase {
  id: string;
  title: string;
}

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.336.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
    </svg>
  );
}

function TasksTab() {
  const [providers, setProviders] = useState<TaskProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Configuration state
  const [configuring, setConfiguring] = useState<TaskProvider | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [notionDatabases, setNotionDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const response = await fetch("/api/tasks/providers");
      if (response.ok) {
        const data = await response.json();
        const filteredProviders = (data.providers || []).filter(
          (p: TaskProvider) => p.provider !== "manual"
        );
        setProviders(filteredProviders);
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfigure(provider: TaskProvider) {
    setConfiguring(provider);
    setConfigLoading(true);

    try {
      if (provider.provider === "github") {
        const response = await fetch("/api/tasks/github/repositories");
        if (response.ok) {
          const data = await response.json();
          setGithubRepos(data.repositories || []);
          setSelectedRepos(data.selected || []);
        }
      } else if (provider.provider === "notion") {
        const response = await fetch("/api/tasks/notion/databases");
        if (response.ok) {
          const data = await response.json();
          setNotionDatabases(data.databases || []);
          setSelectedDatabase(data.selected || "");
        }
      }
    } catch (error) {
      console.error("Failed to fetch configuration:", error);
    } finally {
      setConfigLoading(false);
    }
  }

  async function handleSaveConfiguration() {
    if (!configuring) return;

    setConfigLoading(true);
    try {
      if (configuring.provider === "github") {
        const response = await fetch("/api/tasks/github/repositories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repositories: selectedRepos }),
        });

        if (response.ok) {
          setConfiguring(null);
          await fetchProviders();
        }
      } else if (configuring.provider === "notion") {
        const response = await fetch("/api/tasks/notion/databases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: selectedDatabase }),
        });

        if (response.ok) {
          setConfiguring(null);
          await fetchProviders();
        }
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
    } finally {
      setConfigLoading(false);
    }
  }

  function toggleRepo(repoFullName: string) {
    setSelectedRepos((prev) =>
      prev.includes(repoFullName)
        ? prev.filter((r) => r !== repoFullName)
        : [...prev, repoFullName]
    );
  }

  async function handleSync(providerId: string) {
    setSyncing(providerId);
    try {
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) return;

      const endpoint =
        provider.provider === "notion"
          ? "/api/tasks/notion"
          : "/api/tasks/github";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });

      if (response.ok) {
        await fetchProviders();
      }
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setSyncing(null);
    }
  }

  async function handleDelete(providerId: string) {
    try {
      const response = await fetch(`/api/tasks/providers?id=${providerId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProviders(providers.filter((p) => p.id !== providerId));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete provider:", error);
    }
  }

  function handleConnectNotion() {
    window.location.href = "/api/tasks/notion?action=connect";
  }

  function handleConnectGitHub() {
    window.location.href = "/api/tasks/github?action=connect";
  }

  return (
    <div className="space-y-6">
      {/* Connected Providers */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Verbonden providers</h2>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laden...
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Geen providers verbonden
          </div>
        ) : (
          providers.map((provider) => {
            const Icon = provider.provider === "notion" ? NotionIcon : GitHubIcon;
            const configuredCount = provider.provider === "github"
              ? (provider.providerData?.repositories?.length || 0)
              : provider.providerData?.databaseId ? 1 : 0;

            return (
              <div
                key={provider.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-foreground" />
                    <div>
                      <div className="font-medium text-foreground">
                        {provider.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.provider === "notion" ? "Notion" : "GitHub"}
                        {configuredCount > 0 && (
                          <span className="ml-2">
                            • {configuredCount} {provider.provider === "github" ? "repo's" : "database"}
                          </span>
                        )}
                        {provider.lastSyncAt && (
                          <span className="ml-2">
                            • Laatste sync:{" "}
                            {new Date(provider.lastSyncAt).toLocaleString("nl-NL")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfigure(provider)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Configureren"
                    >
                      <Settings className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleSync(provider.id)}
                      disabled={syncing === provider.id}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                      title="Synchroniseren"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          syncing === provider.id ? "animate-spin" : ""
                        }`}
                      />
                    </button>

                    {deleteConfirm === provider.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(provider.id)}
                          className="rounded-md bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:bg-destructive/90"
                        >
                          Bevestigen
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          Annuleren
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(provider.id)}
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                        title="Verwijderen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Provider */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Provider toevoegen</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={handleConnectNotion}
            disabled={providers.some((p) => p.provider === "notion")}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-card"
          >
            <NotionIcon className="h-8 w-8 text-foreground" />
            <div>
              <div className="font-medium text-foreground">Notion</div>
              <div className="text-xs text-muted-foreground">
                Verbind je Notion workspace
              </div>
            </div>
            <Plus className="ml-auto h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={handleConnectGitHub}
            disabled={providers.some((p) => p.provider === "github")}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-card"
          >
            <GitHubIcon className="h-8 w-8 text-foreground" />
            <div>
              <div className="font-medium text-foreground">GitHub</div>
              <div className="text-xs text-muted-foreground">
                Verbind je GitHub repositories
              </div>
            </div>
            <Plus className="ml-auto h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground">Hoe het werkt</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• Verbind je Notion of GitHub account</li>
          <li>• Klik op het tandwiel icoon om te configureren welke repos/databases gesynchroniseerd worden</li>
          <li>• Taken worden automatisch gesynchroniseerd</li>
          <li>• Sleep taken vanuit de sidebar naar je kalender</li>
        </ul>
      </div>

      {/* Configuration Dialog */}
      {configuring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">
              {configuring.provider === "github" ? "GitHub Repositories" : "Notion Database"}
            </h2>

            {configLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Laden...
              </div>
            ) : configuring.provider === "github" ? (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {githubRepos.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Geen repositories gevonden
                  </div>
                ) : (
                  githubRepos.map((repo) => (
                    <label
                      key={repo.fullName}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRepos.includes(repo.fullName)}
                        onChange={() => toggleRepo(repo.fullName)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{repo.fullName}</div>
                        {repo.description && (
                          <div className="text-xs text-muted-foreground">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {notionDatabases.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Geen databases gevonden
                  </div>
                ) : (
                  notionDatabases.map((db) => (
                    <label
                      key={db.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted"
                    >
                      <input
                        type="radio"
                        name="database"
                        checked={selectedDatabase === db.id}
                        onChange={() => setSelectedDatabase(db.id)}
                      />
                      <div className="flex-1 text-sm font-medium">{db.title}</div>
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfiguring(null)}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveConfiguration}
                disabled={configLoading || (configuring.provider === "github" && selectedRepos.length === 0) || (configuring.provider === "notion" && !selectedDatabase)}
                className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {selected && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-foreground" : "bg-border"
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
