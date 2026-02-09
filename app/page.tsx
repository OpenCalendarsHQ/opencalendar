"use client";

import Image from "next/image";
import Link from "next/link";
import DarkVeil from "@/components/animations/dark-veil";
import { Calendar, Github } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-black overflow-hidden">
      {/* Dark Veil WebGL Background */}
      <div className="absolute inset-0 w-full h-full">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.02}
          scanlineIntensity={0}
          speed={0.3}
          scanlineFrequency={0}
          warpAmount={0.1}
          resolutionScale={1}
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
          <Image src="/icon.svg" alt="OpenCalendar" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white">OPENCALENDAR</span>
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
              Sync all your calendars<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                in one place
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400 md:text-xl">
              OpenCalendar brings all your Google Calendar and iCloud events together.
              Build better schedules with a unified view of your time.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="w-full rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/auth/sign-in"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-8 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-white sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid gap-6 pt-12 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">Multi-Calendar Sync</h3>
              <p className="text-sm text-zinc-400">
                Connect Google Calendar and iCloud in one unified view
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">Recurring Events</h3>
              <p className="text-sm text-zinc-400">
                Full support for recurring events with flexible editing options
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-white">Open Source</h3>
              <p className="text-sm text-zinc-400">
                Free and open source software built for the community
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-6 py-6 md:px-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
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
          <div className="flex items-center gap-4">
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
