"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useSettings } from "@/lib/settings-context";

export default function AppearanceSettingsPage() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-medium text-foreground">Weergave</h1>
          <p className="text-xs text-muted-foreground">Kalender weergave-instellingen</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <SettingSection title="Thema" description="Kies tussen licht, donker of automatisch op basis van systeem">
          <div className="flex gap-2">
            {([
              { value: "light" as const, label: "Licht" },
              { value: "dark" as const, label: "Donker" },
              { value: "auto" as const, label: "Automatisch" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.theme === opt.value}
                onClick={() => updateSettings({ theme: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Color scheme */}
        <SettingSection title="Kleurenschema" description="Kies een kleurthema voor de app">
          <div className="flex gap-2">
            {([
              { value: "default" as const, label: "Standaard" },
              { value: "blue" as const, label: "Blauw" },
              { value: "purple" as const, label: "Paars" },
              { value: "green" as const, label: "Groen" },
              { value: "orange" as const, label: "Oranje" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.colorScheme === opt.value}
                onClick={() => updateSettings({ colorScheme: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Compact mode */}
        <SettingSection title="Compacte modus" description="Dichtere UI voor meer informatie op het scherm">
          <ToggleSwitch
            checked={settings.compactMode}
            onChange={(checked) => updateSettings({ compactMode: checked })}
          />
        </SettingSection>

        {/* First day of week */}
        <SettingSection title="Eerste dag van de week" description="Kies of de week begint op maandag of zondag">
          <div className="flex gap-2">
            <OptionButton
              label="Maandag"
              selected={settings.weekStartsOn === 1}
              onClick={() => updateSettings({ weekStartsOn: 1 })}
            />
            <OptionButton
              label="Zondag"
              selected={settings.weekStartsOn === 0}
              onClick={() => updateSettings({ weekStartsOn: 0 })}
            />
          </div>
        </SettingSection>

        {/* Time format */}
        <SettingSection title="Tijdformaat" description="Kies 24-uurs of 12-uurs weergave">
          <div className="flex gap-2">
            <OptionButton
              label="24 uur (14:00)"
              selected={settings.timeFormat === "24h"}
              onClick={() => updateSettings({ timeFormat: "24h" })}
            />
            <OptionButton
              label="12 uur (2:00 PM)"
              selected={settings.timeFormat === "12h"}
              onClick={() => updateSettings({ timeFormat: "12h" })}
            />
          </div>
        </SettingSection>

        {/* Default view */}
        <SettingSection title="Standaard weergave" description="De weergave die je ziet bij het openen van de app">
          <div className="flex gap-2">
            {([
              { value: "day" as const, label: "Dag" },
              { value: "week" as const, label: "Week" },
              { value: "month" as const, label: "Maand" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.defaultView === opt.value}
                onClick={() => updateSettings({ defaultView: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Week numbers */}
        <SettingSection title="Weeknummers" description="Toon weeknummers in de kalender">
          <ToggleSwitch
            checked={settings.showWeekNumbers}
            onChange={(checked) => updateSettings({ showWeekNumbers: checked })}
          />
        </SettingSection>

        {/* Default event duration */}
        <SettingSection title="Standaard afspraakduur" description="Standaardduur voor nieuwe afspraken">
          <div className="flex flex-wrap gap-2">
            {([
              { value: 30 as const, label: "30 min" },
              { value: 60 as const, label: "1 uur" },
              { value: 90 as const, label: "1,5 uur" },
              { value: 120 as const, label: "2 uur" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.defaultEventDuration === opt.value}
                onClick={() => updateSettings({ defaultEventDuration: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Show declined events */}
        <SettingSection title="Afgewezen afspraken" description="Toon afspraken die je hebt afgewezen">
          <ToggleSwitch
            checked={settings.showDeclinedEvents}
            onChange={(checked) => updateSettings({ showDeclinedEvents: checked })}
          />
        </SettingSection>
      </div>
    </div>
  );
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {selected && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-foreground" : "bg-border"
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
