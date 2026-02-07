"use client";

import Link from "next/link";
import { ArrowLeft, Link2, Palette, Bell, Globe, Shield, ChevronRight } from "lucide-react";

const settingsItems = [
  { href: "/settings/accounts", icon: Link2, title: "Verbonden accounts", description: "Google Calendar, iCloud en andere accounts", active: true },
  { href: "/settings/appearance", icon: Palette, title: "Weergave", description: "Startdag, tijdformaat, weeknummers", active: true },
  { href: "/settings/region", icon: Globe, title: "Taal & regio", description: "Tijdzone en datumnotatie", active: true },
  { href: "#", icon: Bell, title: "Meldingen", description: "Herinneringen en notificaties", active: false },
  { href: "#", icon: Shield, title: "Privacy", description: "Beveiliging en data export", active: false },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">Instellingen</h1>
          <p className="text-xs text-muted-foreground">Beheer je voorkeuren</p>
        </div>
      </div>

      <div className="space-y-px">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const Component = item.active ? Link : "div";

          return (
            <Component key={item.title} href={item.active ? item.href : "#"}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 ${
                item.active ? "cursor-pointer hover:bg-muted" : "cursor-default opacity-40"
              }`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  {item.title}
                  {!item.active && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">Binnenkort</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              {item.active && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </Component>
          );
        })}
      </div>
    </div>
  );
}
