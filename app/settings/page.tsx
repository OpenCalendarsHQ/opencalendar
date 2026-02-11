"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Palette,
  Globe,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Loader2,
  CheckSquare,
  Calendar as CalendarIcon,
  Monitor,
  Laptop,
} from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { AccountTab } from "./components/account-tab";
import { AppearanceTab } from "./components/appearance-tab";
import { RegionTab } from "./components/region-tab";
import { TasksTab } from "./components/tasks-tab";
import { DesktopTab } from "./components/desktop-tab";
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

type TabType = "calendars" | "account" | "appearance" | "region" | "tasks" | "desktop";

function SettingsContent() {
  const t = useTranslations("Settings");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("calendars");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [allCalendars, setAllCalendars] = useState<{ id: string; name: string; accountEmail: string }[]>([]);
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
    { id: "desktop" as TabType, label: t("tabs.desktop"), icon: Laptop },
  ];

  const fetchAccounts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch("/api/calendars");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Process accounts
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

          // Process all individual calendars for the default selector
          const flattened: { id: string; name: string; accountEmail: string }[] = [];
          data.forEach((group: any) => {
            if (Array.isArray(group.calendars)) {
              group.calendars.forEach((cal: any) => {
                if (!cal.isReadOnly) {
                  flattened.push({
                    id: cal.id,
                    name: cal.name,
                    accountEmail: group.email || "Lokaal",
                  });
                }
              });
            }
          });
          setAllCalendars(flattened);
        }
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Set active tab from URL parameter if present
    const tab = searchParams.get("tab") as TabType;
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    }

    // Check for syncing flag or connected flag in URL
    const connected = searchParams.get('connected');
    const syncing = searchParams.get('syncing');

    if (syncing === 'true' || connected) {
      if (connected === 'google') {
        setSuccess('Google Calendar succesvol verbonden - synchronisatie loopt...');
      } else if (connected === 'microsoft') {
        setSuccess('Microsoft Calendar succesvol verbonden - synchronisatie loopt...');
      } else if (syncing === 'true') {
        setSuccess('Account verbonden - synchronisatie loopt...');
      }

      const interval = setInterval(() => {
        fetchAccounts(false);
      }, 2000);

      setTimeout(() => {
        clearInterval(interval);
        setSuccess(null);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    // Update URL without full refresh
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tabId);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

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
        setShowICloudModal(false);
        setICloudEmail("");
        setICloudPassword("");
        window.history.replaceState(null, "", "/settings?tab=calendars&syncing=true");
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
        setShowCalDAVModal(false);
        setCaldavServerUrl("");
        setCaldavUsername("");
        setCaldavEmail("");
        setCaldavPassword("");
        window.history.replaceState(null, "", "/settings?tab=calendars&syncing=true");
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
                onClick={() => handleTabChange(tab.id)}
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

            <div className="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-1 text-sm font-medium text-foreground">Standaard kalender</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Deze kalender wordt automatisch geselecteerd voor nieuwe evenementen en taken.
              </p>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Selecteer kalender</label>
                <select
                  value={settings.defaultCalendarId || ""}
                  onChange={(e) => updateSettings({ defaultCalendarId: e.target.value || null })}
                  className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="">Geen (gebruik eerste beschikbare)</option>
                  {allCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name} ({cal.accountEmail})
                    </option>
                  ))}
                </select>
                {!settings.defaultCalendarId && allCalendars.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Tip: Selecteer een kalender om sneller nieuwe items toe te voegen.
                  </p>
                )}
              </div>
            </div>

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

        {activeTab === "account" && <AccountTab />}
        {activeTab === "appearance" && <AppearanceTab />}
        {activeTab === "region" && <RegionTab />}
        {activeTab === "tasks" && <TasksTab />}
        {activeTab === "desktop" && <DesktopTab />}
      </div>

      {/* iCloud Modal */}
      {showICloudModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowICloudModal(false)} />
          <div className="relative w-full max-sm rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
            <h2 className="text-sm font-medium text-foreground">iCloud Calendar verbinden</h2>
            <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Hoe krijg ik een app-wachtwoord?</p>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Ga naar <a href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer"
                  className="text-foreground underline hover:text-foreground/80">account.apple.com</a></li>
                <li>Log in met je Apple ID</li>
                <li>Ga naar &quot;Beveiliging&quot; → &quot;App-specifieke wachtwoorden&quot;</li>
                <li>Genereer een nieuw wachtwoord voor &quot;OpenCalendars&quot;</li>
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
          <div className="relative w-full max-md rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
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
          <div className="relative w-full max-sm rounded-t-xl border border-border bg-popover p-5 shadow-lg safe-bottom md:rounded-lg">
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
