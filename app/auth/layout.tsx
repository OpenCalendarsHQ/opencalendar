import Image from "next/image";
import Link from "next/link";
import { GridMotion } from "@/components/ui/grid-motion";

const gridItems = [
  '📅',
  <div key='jsx-item-1' className="text-sm">Sync</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '⏰',
  <div key='jsx-item-2' className="text-sm">Plan</div>,
  '📊',
  <div key='jsx-item-3' className="text-sm">Track</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '✅',
  <div key='jsx-item-4' className="text-sm">Organize</div>,
  '🎯',
  <div key='jsx-item-5' className="text-sm">Focus</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '📱',
  <div key='jsx-item-6' className="text-sm">Mobile</div>,
  '🔄',
  <div key='jsx-item-7' className="text-sm">Sync</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '🌐',
  <div key='jsx-item-8' className="text-sm">Connect</div>,
  '💼',
  <div key='jsx-item-9' className="text-sm">Work</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  '🚀',
  <div key='jsx-item-10' className="text-sm">Boost</div>,
  '⚡',
  <div key='jsx-item-11' className="text-sm">Fast</div>,
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between p-12 lg:flex relative overflow-hidden">
        {/* Background Grid Motion */}
        <div className="absolute inset-0 opacity-20">
          <GridMotion items={gridItems} gradientColor="#4f46e5" />
        </div>

        {/* Content */}
        <Link href="/" className="flex items-center gap-3 relative z-10">
          <Image src="/icon.svg" alt="OpenCalendar" width={40} height={40} />
          <span className="font-pixel text-2xl font-bold text-white">OPENCALENDAR</span>
        </Link>

        <div className="relative z-10">
          <h1 className="mb-4 text-5xl font-bold leading-tight text-white">
            Build <span className="text-indigo-400">better schedules</span><br />
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
