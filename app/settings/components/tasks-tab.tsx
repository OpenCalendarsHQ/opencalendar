"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Trash2, Plus, Settings } from "lucide-react";

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

export function TasksTab() {
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
