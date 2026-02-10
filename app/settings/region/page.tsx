"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/lib/settings-context";

const COMMON_TIMEZONES = [
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/London", label: "Londen (GMT)" },
  { value: "Europe/Berlin", label: "Berlijn (CET)" },
  { value: "Europe/Paris", label: "Parijs (CET)" },
  { value: "Europe/Brussels", label: "Brussel (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Zurich", label: "Zürich (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

export default function RegionSettingsPage() {
  const t = useTranslations("Settings.region");
  const { settings, updateSettings } = useSettings();

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">{t("language")} & regio</h1>
          <p className="text-xs text-muted-foreground">Tijdzone en regionale instellingen</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Language switcher */}
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-foreground">{t("language")}</h3>
            <p className="text-xs text-muted-foreground">{t("selectLanguage")}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateSettings({ language: "nl" })}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
                settings.language === "nl"
                  ? "border-foreground bg-foreground/5 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <span>{t("dutch")}</span>
              {settings.language === "nl" && (
                <div className="h-2 w-2 rounded-full bg-foreground" />
              )}
            </button>
            <button
              onClick={() => updateSettings({ language: "en" })}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
                settings.language === "en"
                  ? "border-foreground bg-foreground/5 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <span>{t("english")}</span>
              {settings.language === "en" && (
                <div className="h-2 w-2 rounded-full bg-foreground" />
              )}
            </button>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground italic">
            * De pagina wordt herladen om de taal te wijzigen.
          </p>
        </div>

        {/* Timezone */}
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-foreground">Tijdzone</h3>
            <p className="text-xs text-muted-foreground">
              Je systeem detecteert: <span className="font-medium text-foreground">{detectedTimezone}</span>
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => updateSettings({ timezone: detectedTimezone })}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${
                settings.timezone === detectedTimezone
                  ? "border-foreground bg-foreground/5 font-medium text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <span>Automatisch ({detectedTimezone})</span>
              {settings.timezone === detectedTimezone && (
                <div className="h-2 w-2 rounded-full bg-foreground" />
              )}
            </button>

            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {COMMON_TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  onClick={() => updateSettings({ timezone: tz.value })}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs ${
                    settings.timezone === tz.value
                      ? "bg-foreground/5 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tz.label}</span>
                  {settings.timezone === tz.value && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
