"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountView } from "@neondatabase/auth/react";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">Account & Beveiliging</h1>
          <p className="text-xs text-muted-foreground">Beheer je account instellingen</p>
        </div>
      </div>

      <AccountView path="settings" />
    </div>
  );
}
