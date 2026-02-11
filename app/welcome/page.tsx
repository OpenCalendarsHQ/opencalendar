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
  Monitor,
  Apple,
  Terminal,
} from "lucide-react";

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
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelease() {
      try {
        // Public repo — no token needed for the GitHub API
        const response = await fetch(
          "https://api.github.com/repos/ArjandenHartog/opencalendar/releases/tags/latest",
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (response.ok) {
          setRelease(await response.json());
        } else {
          const allResponse = await fetch(
            "https://api.github.com/repos/ArjandenHartog/opencalendar/releases",
            { headers: { Accept: "application/vnd.github.v3+json" } }
          );
          if (allResponse.ok) {
            const releases = await allResponse.json();
            if (releases.length > 0) setRelease(releases[0]);
          }
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
  const linuxAsset = getAsset(".appimage");

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
          <span className="font-pixel text-2xl font-bold text-white uppercase tracking-tighter">OPENCALENDARS</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/ArjandenHartog/opencalendar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
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
                      <Monitor className="h-4 w-4" />
                      Windows (.msi)
                      <span className="text-xs text-zinc-500">{formatSize(winAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <Monitor className="h-4 w-4" />
                    Windows
                    <span className="text-xs">{t("download.comingSoon")}</span>
                  </button>
                )}

                {/* macOS */}
                {loading ? (
                  <div className="h-11 w-48 animate-pulse rounded-lg bg-zinc-800" />
                ) : macAsset ? (
                  <Link href={macAsset.browser_download_url}>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:border-blue-500/60 hover:bg-blue-500/20 hover:text-blue-200">
                      <Apple className="h-4 w-4" />
                      macOS (.dmg)
                      <span className="text-xs text-blue-400/60">{formatSize(macAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <Apple className="h-4 w-4" />
                    macOS
                    <span className="text-xs">{t("download.comingSoon")}</span>
                  </button>
                )}

                {/* Linux */}
                {loading ? (
                  <div className="h-11 w-48 animate-pulse rounded-lg bg-zinc-800" />
                ) : linuxAsset ? (
                  <Link href={linuxAsset.browser_download_url}>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-orange-500/50 hover:bg-zinc-800/80 hover:text-white">
                      <Terminal className="h-4 w-4" />
                      Linux (.AppImage)
                      <span className="text-xs text-zinc-500">{formatSize(linuxAsset.size)}</span>
                    </button>
                  </Link>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-2.5 text-sm text-zinc-600 cursor-not-allowed">
                    <Terminal className="h-4 w-4" />
                    Linux
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
            Made by{" "}
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
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Terms
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
