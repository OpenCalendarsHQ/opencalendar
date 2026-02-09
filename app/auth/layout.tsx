"use client";

import Image from "next/image";
import Link from "next/link";
import Aurora from "@/components/animations/aurora";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between p-12 lg:flex relative overflow-hidden bg-black">
        {/* Aurora WebGL Background - Full Width */}
        <div className="absolute inset-0 w-full h-full">
          <Aurora
            colorStops={["#0080ff", "#00ffff", "#004080"]}
            blend={0.5}
            amplitude={1.0}
            speed={1}
          />
        </div>

        {/* Gradient Overlay for depth */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top gradient veil */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />

          {/* Bottom gradient veil */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

          {/* Center radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]" />

          {/* Left edge darkening */}
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/40 to-transparent" />

          {/* Right edge darkening */}
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/40 to-transparent" />
        </div>

        {/* Content */}
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <Image src="/icon.svg" alt="OpenCalendar" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white">OPENCALENDAR</span>
        </Link>

        <div className="relative z-10">
          <h1 className="mb-4 text-5xl font-pixel font-bold leading-tight text-white">
            Build <span className="text-blue-400">better schedules</span><br />
            with OpenCalendar
          </h1>
          <p className="text-xl text-zinc-400">
            Sync all your calendars and build insights.
          </p>
        </div>

        <div className="text-xs text-zinc-500 relative z-10">
          Powered by{" "}
          <Link href="/" className="text-zinc-400 hover:text-white">
            OpenCalendar
          </Link>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex w-full items-center justify-center bg-[#111111] lg:w-1/2">
        <div className="w-full max-w-md px-8">
          <Link href="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Image src="/icon.svg" alt="OpenCalendar" width={40} height={40} />
            <span className="font-pixel text-2xl font-bold text-white">OPENCALENDAR</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
