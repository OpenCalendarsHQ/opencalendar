"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";

// Custom SVG icons matching sidebar
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.537 1.537 1.168 2.069.63.532 1.458.811 2.342.811.36 0 .724-.052 1.076-.157.652-.195 1.245-.566 1.707-1.074.463.508 1.055.879 1.707 1.074.352.105.716.157 1.076.157.884 0 1.712-.279 2.342-.811.631-.532 1.051-1.29 1.168-2.069.123-.805-.009-1.657-.287-2.489-.589-1.771-1.831-3.47-2.716-4.521-.75-1.067-.974-1.928-1.05-3.02-.065-1.491 1.056-5.965-3.17-6.298-.165-.013-.325-.021-.48-.021zm-1.5 1.5c.052 0 .105.002.158.006 3.645.285 2.747 4.307 2.812 5.511.085 1.573.376 2.622 1.232 3.836.82 1.164 1.972 2.762 2.511 4.382.227.678.329 1.382.237 2.025-.082.59-.386 1.152-.855 1.549-.47.397-1.082.596-1.695.596-.264 0-.53-.038-.786-.114-.507-.151-.962-.452-1.314-.819-.352.367-.807.668-1.314.819-.256.076-.522.114-.786.114-.613 0-1.225-.199-1.695-.596-.469-.397-.773-.959-.855-1.549-.092-.643.01-1.347.237-2.025.539-1.62 1.691-3.218 2.511-4.382.856-1.214 1.147-2.263 1.232-3.836.065-1.204-.833-5.226 2.812-5.511.053-.004.106-.006.158-.006zm-.75 3.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm3 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm-7.5 6c-.414 0-.75.336-.75.75s.336.75.75.75.75-.336.75-.75-.336-.75-.75-.75zm12 0c-.414 0-.75.336-.75.75s.336.75.75.75.75-.336.75-.75-.336-.75-.75-.75z"/>
    </svg>
  );
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  assets: ReleaseAsset[];
}

export function DesktopTab() {
  const t = useTranslations("Welcome");
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [winFormat, setWinFormat] = useState<"msi" | "exe">("msi");

  useEffect(() => {
    async function fetchRelease() {
      try {
        const response = await fetch("/api/releases");
        if (response.ok) {
          const data = await response.json();
          setRelease(data);
        }
      } catch (err) {
        console.error("Error fetching release:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRelease();
  }, []);

  const getAsset = (ext: string) =>
    release?.assets.find((a) =>
      a.name.toLowerCase().endsWith(ext.toLowerCase())
    );

  const formatSize = (bytes: number) =>
    (bytes / (1024 * 1024)).toFixed(1) + " MB";

  const winAsset = winFormat === "msi" 
    ? (getAsset(".msi") || getAsset(".exe"))
    : (getAsset(".exe") || getAsset(".msi"));
  const macAsset = getAsset(".dmg");
  const linuxAsset = getAsset(".AppImage");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-sm font-medium text-foreground">{t("download.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("download.subtitle")}</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Laden...</span>
          </div>
        ) : (
          <>
            {/* Windows */}
            {winAsset ? (
              <div className="space-y-3">
                <a
                  href={winAsset.browser_download_url}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <WindowsIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{t("download.windowsLabel")}</div>
                    <div className="text-xs text-muted-foreground">{formatSize(winAsset.size)}</div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>

                {/* Improved Format Selector */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Formaat:</span>
                  <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 gap-1" role="group" aria-label="Installer formaat selectie">
                    <button
                      onClick={() => setWinFormat("msi")}
                      className={`
                        px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                        ${
                          winFormat === "msi"
                            ? "bg-blue-500/90 text-white shadow-sm hover:bg-blue-600"
                            : "text-foreground/70 hover:text-foreground hover:bg-background/50"
                        }
                      `}
                      aria-pressed={winFormat === "msi"}
                      aria-label="MSI installer selecteren"
                      type="button"
                    >
                      .msi
                    </button>
                    <button
                      onClick={() => setWinFormat("exe")}
                      className={`
                        px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                        ${
                          winFormat === "exe"
                            ? "bg-blue-500/90 text-white shadow-sm hover:bg-blue-600"
                            : "text-foreground/70 hover:text-foreground hover:bg-background/50"
                        }
                      `}
                      aria-pressed={winFormat === "exe"}
                      aria-label="EXE installer selecteren"
                      type="button"
                    >
                      .exe
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {winFormat === "msi" ? "(Aanbevolen voor bedrijven)" : "(Snelle installatie)"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 opacity-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <WindowsIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("download.windowsLabel")}</div>
                  <div className="text-xs text-muted-foreground">{t("download.comingSoon")}</div>
                </div>
              </div>
            )}

            {/* macOS */}
            {macAsset ? (
              <a
                href={macAsset.browser_download_url}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <AppleIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("download.macLabel")}</div>
                  <div className="text-xs text-muted-foreground">{formatSize(macAsset.size)}</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 opacity-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <AppleIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("download.macLabel")}</div>
                  <div className="text-xs text-muted-foreground">{t("download.comingSoon")}</div>
                </div>
              </div>
            )}

            {/* Linux */}
            {linuxAsset ? (
              <a
                href={linuxAsset.browser_download_url}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <LinuxIcon className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("download.linuxLabel")}</div>
                  <div className="text-xs text-muted-foreground">{formatSize(linuxAsset.size)}</div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 opacity-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <LinuxIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{t("download.linuxLabel")}</div>
                  <div className="text-xs text-muted-foreground">{t("download.comingSoon")}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {release && (
        <p className="text-xs text-muted-foreground">
          {t("download.version")}: {release.tag_name}
        </p>
      )}
    </div>
  );
}
