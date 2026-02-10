"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Download, 
  Monitor, 
  Apple, 
  Terminal, 
  ArrowRight,
  Github,
  Zap,
  ShieldCheck,
  RefreshCw,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Aurora from "@/components/animations/aurora";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
}

const GITHUB_TOKEN = "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";
const REPO_OWNER = "ArjandenHartog";
const REPO_NAME = "opencalendar";

export default function WelcomePage() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelease() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/latest`,
          {
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!response.ok) {
          // Fallback to all releases if 'latest' tag doesn't exist yet
          const allResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
            {
              headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );
          if (allResponse.ok) {
            const releases = await allResponse.json();
            if (releases.length > 0) {
              setRelease(releases[0]);
            }
          }
        } else {
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

  const getAssetByExtension = (ext: string) => {
    return release?.assets.find(asset => asset.name.toLowerCase().endsWith(ext.toLowerCase()));
  };

  const winAsset = getAssetByExtension(".msi");
  const macAsset = getAssetByExtension(".dmg");
  const linuxAsset = getAssetByExtension(".appimage");

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

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
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/icon.svg" alt="OpenCalendar" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white uppercase tracking-tighter">OPENCALENDAR</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              Open Web App
            </Button>
          </Link>
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
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 md:px-12">
        <div className="max-w-6xl w-full space-y-16">
          
          <div className="text-center space-y-6">
            <Badge variant="outline" className="px-4 py-1 border-blue-500/30 bg-blue-500/10 text-blue-400">
              Desktop Version Now Available
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white">
              Desktop <span className="text-blue-500">Experience</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400 md:text-xl">
              Download the native OpenCalendar app for maximum speed, offline access, and a better workflow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Windows */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-blue-500/50 hover:bg-zinc-900/60">
              <div className="mb-6 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-500 transition-transform group-hover:scale-110">
                <Monitor className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Windows</h3>
              <p className="text-zinc-400 mb-8 h-12">Stable installer for Windows 10 and 11.</p>
              
              {loading ? (
                <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-800" />
              ) : winAsset ? (
                <div className="space-y-3">
                  <Link href={winAsset.browser_download_url}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg">
                      <Download className="mr-2 h-5 w-5" />
                      Download .msi
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    {formatSize(winAsset.size)} • {release?.tag_name}
                  </p>
                </div>
              ) : (
                <Button disabled className="w-full h-12 text-zinc-500 bg-zinc-800">Coming Soon</Button>
              )}
            </div>

            {/* macOS */}
            <div className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 p-8 backdrop-blur-md transition-all hover:border-blue-500/60">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Recommended
              </div>
              <div className="mb-6 inline-flex rounded-xl bg-blue-500/20 p-3 text-blue-400 transition-transform group-hover:scale-110">
                <Apple className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">macOS</h3>
              <p className="text-zinc-400 mb-8 h-12">Universal binary for Apple Silicon and Intel.</p>
              
              {loading ? (
                <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-800" />
              ) : macAsset ? (
                <div className="space-y-3">
                  <Link href={macAsset.browser_download_url}>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 text-lg shadow-lg shadow-blue-500/20">
                      <Download className="mr-2 h-5 w-5" />
                      Download .dmg
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    {formatSize(macAsset.size)} • {release?.tag_name}
                  </p>
                </div>
              ) : (
                <Button disabled className="w-full h-12 text-zinc-500 bg-zinc-800">Coming Soon</Button>
              )}
            </div>

            {/* Linux */}
            <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-orange-500/50 hover:bg-zinc-900/60">
              <div className="mb-6 inline-flex rounded-xl bg-orange-500/10 p-3 text-orange-500 transition-transform group-hover:scale-110">
                <Terminal className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Linux</h3>
              <p className="text-zinc-400 mb-8 h-12">Portable AppImage for any distribution.</p>
              
              {loading ? (
                <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-800" />
              ) : linuxAsset ? (
                <div className="space-y-3">
                  <Link href={linuxAsset.browser_download_url}>
                    <Button variant="outline" className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-12 text-lg">
                      <Download className="mr-2 h-5 w-5" />
                      Download .AppImage
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    {formatSize(linuxAsset.size)} • {release?.tag_name}
                  </p>
                </div>
              ) : (
                <Button disabled className="w-full h-12 text-zinc-500 bg-zinc-800">Coming Soon</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 text-center">
            <div className="space-y-2">
              <Zap className="mx-auto h-6 w-6 text-yellow-500" />
              <h4 className="font-bold text-white">Native Speed</h4>
              <p className="text-sm text-zinc-500">Built with Rust and Tauri</p>
            </div>
            <div className="space-y-2">
              <ShieldCheck className="mx-auto h-6 w-6 text-green-500" />
              <h4 className="font-bold text-white">Full Privacy</h4>
              <p className="text-sm text-zinc-500">Your data, your machine</p>
            </div>
            <div className="space-y-2">
              <RefreshCw className="mx-auto h-6 w-6 text-blue-500" />
              <h4 className="font-bold text-white">Auto Sync</h4>
              <p className="text-sm text-zinc-500">Web and desktop stay synced</p>
            </div>
            <div className="space-y-2">
              <ArrowRight className="mx-auto h-6 w-6 text-zinc-400" />
              <h4 className="font-bold text-white">Offline Access</h4>
              <p className="text-sm text-zinc-500">Work even without internet</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 border-t border-zinc-900 pt-16">
            <h2 className="text-3xl font-bold text-white tracking-tight">Prefer the web version?</h2>
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 bg-zinc-100 text-black hover:bg-white group">
                Open Web Dashboard
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-12 md:px-12">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/icon.svg" alt="OpenCalendar" width={32} height={32} />
            <span className="font-pixel text-lg font-bold text-white uppercase tracking-tighter">OPENCALENDAR</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 OpenCalendar. All rights reserved. Built for speed and privacy.
          </p>
          <div className="flex items-center gap-6">
            <Link href="https://github.com/ArjandenHartog/opencalendar" className="text-zinc-500 hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
