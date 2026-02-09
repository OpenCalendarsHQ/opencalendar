"use client";

import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Inloggen mislukt
        </h1>
        <p className="text-zinc-400">
          Er is iets misgegaan tijdens het inloggen
        </p>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-medium text-red-400 mb-1">Authenticatie fout</h3>
            <p className="text-sm text-zinc-400">
              De authenticatie code kon niet worden geverifieerd. Dit kan gebeuren als:
            </p>
            <ul className="mt-3 text-sm text-zinc-400 list-disc list-inside space-y-1">
              <li>De redirect URL niet correct is geconfigureerd in Supabase</li>
              <li>De authenticatie code is verlopen</li>
              <li>Er een netwerkprobleem is opgetreden</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/auth/sign-in"
          className="block w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-center"
        >
          Opnieuw proberen
        </Link>
        <Link
          href="/"
          className="block w-full bg-zinc-800 text-white font-medium py-3 px-4 rounded-lg hover:bg-zinc-700 transition-colors text-center"
        >
          Terug naar home
        </Link>
      </div>

      <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium text-zinc-300 mb-2">Voor developers:</h4>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Check of de redirect URL <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-indigo-400">
            {typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback
          </code> is toegevoegd aan de Allowed Redirect URLs in je Supabase project instellingen
          (Authentication → URL Configuration).
        </p>
      </div>
    </div>
  );
}
