"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Aurora from "@/components/animations/aurora";
import {
  Calendar,
  Github,
  Download,
} from "lucide-react";

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

export default function WelcomePage() {
  const t = useTranslations("Welcome");
  const [locale, setLocale] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(^|; )NEXT_LOCALE=([^;]+)/);
      setLocale(m?.[2] ?? "nl");
    } else {
      setLocale("nl");
    }
    setMounted(true);
  }, []);
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelease() {
      try {
        // Use internal API that has access to the GitHub token
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

  const winAsset = getAsset(".msi");
  const macAsset = getAsset(".dmg");
  const linuxAsset = getAsset(".AppImage");

  return (
    <div className="relative flex min-h-screen flex-col bg-black overflow-hidden">
      {/* Aurora WebGL Background */}
      <div className="absolute inset-0 w-full h-full">
        <Aurora
          colorStops={["#0080ff", "#00ffff", "#004080"]}
          blend={0.5}
          amplitude={1.0}
          speed={1}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/40 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/icon.svg" alt="OpenCalendars" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white uppercase tracking-tighter">{t("brand")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/ArjandenHartog/opencalendar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">{t("github")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (locale !== "nl") {
                  document.cookie = `NEXT_LOCALE=nl; path=/; max-age=31536000; SameSite=Lax`;
                  window.location.reload();
                }
              }}
              className={`px-2 py-1 rounded text-sm ${mounted && locale === "nl" ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
            >
              NL
            </button>
            <button
              onClick={() => {
                if (locale !== "en") {
                  document.cookie = `NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax`;
                  window.location.reload();
                }
              }}
              className={`px-2 py-1 rounded text-sm ${mounted && locale === "en" ? "bg-zinc-800 text-white" : "text-zinc-300"}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center md:px-12">
        <div className="max-w-4xl space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 backdrop-blur-sm border border-blue-500/20">
              <Calendar className="h-12 w-12 text-blue-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="font-pixel text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              {t("title")}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400 md:text-xl">
              {t("subtitle")}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="w-full rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              {t("getStarted")}
            </Link>
            <Link
              href="/auth/sign-in"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-8 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-white sm:w-auto"
            >
              {t("signIn")}
            </Link>
          </div>

          {/* Features */}
          <div className="grid gap-6 pt-12 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">{t("features.syncTitle")}</h3>
              <p className="text-sm text-zinc-400">
                {t("features.syncDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">{t("features.recurringTitle")}</h3>
              <p className="text-sm text-zinc-400">
                {t("features.recurringDesc")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">{t("features.openSourceTitle")}</h3>
              <p className="text-sm text-zinc-400">
                {t("features.openSourceDesc")}
              </p>
            </div>
          </div>

          {/* Desktop Downloads Section */}
          <div className="border-t border-zinc-800 pt-12 mt-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {t("download.title")}
                </h2>
                <p className="text-sm text-zinc-400">
                  {t("download.subtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Windows */}
                {loading ? (
                  <div className="h-11 w-48 animate-pulse rounded-lg bg-zinc-800" />
                ) : winAsset ? (
                  <Link href={winAsset.browser_download_url}>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-blue-500/50 hover:bg-zinc-800/80 hover:text-white">
                      <WindowsIcon className="h-4 w-4" />
                      {t("download.windowsLabel")}
                      <span className="text-xs text-zinc-500">{formatSize(winAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <WindowsIcon className="h-4 w-4" />
                    {t("download.windowsLabel")}
                    <span className="text-xs">{t("download.comingSoon")}</span>
                  </button>
                )}

                {/* macOS */}
                {loading ? (
                  <div className="h-11 w-48 animate-pulse rounded-lg bg-zinc-800" />
                ) : macAsset ? (
                  <Link href={macAsset.browser_download_url}>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:border-blue-500/60 hover:bg-blue-500/20 hover:text-blue-200">
                      <AppleIcon className="h-4 w-4" />
                      {t("download.macLabel")}
                      <span className="text-xs text-blue-400/60">{formatSize(macAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <AppleIcon className="h-4 w-4" />
                    {t("download.macLabel")}
                    <span className="text-xs">{t("download.comingSoon")}</span>
                  </button>
                )}

                {/* Linux */}
                {loading ? (
                  <div className="h-11 w-48 animate-pulse rounded-lg bg-zinc-800" />
                ) : linuxAsset ? (
                  <Link href={linuxAsset.browser_download_url}>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-orange-500/50 hover:bg-zinc-800/80 hover:text-white">
                      <LinuxIcon className="h-4 w-4" />
                      {t("download.linuxLabel")}
                      <span className="text-xs text-zinc-500">{formatSize(linuxAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <LinuxIcon className="h-4 w-4" />
                    {t("download.linuxLabel")}
                    <span className="text-xs">{t("download.comingSoon")}</span>
                  </button>
                )}
              </div>

              {release && (
                <p className="text-xs text-zinc-600">
                  {t("download.version")}: {release.tag_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-6 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/icon.svg" alt="OpenCalendars"
 width={32} height={32} />
            <span className="font-pixel text-lg font-bold text-white uppercase tracking-tighter">OPENCALENDAR</span>
          </div>
          <p className="text-sm text-zinc-500">
            {t("madeBy")} {" "}
            <Link
              href="https://arjandenhartog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Arjan den Hartog
            </Link>
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                {t("terms")}
              </Link>
            </div>
            <Link
              href="https://github.com/ArjandenHartog/opencalendar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 transition-colors hover:text-zinc-400"
            >
              <Github className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
