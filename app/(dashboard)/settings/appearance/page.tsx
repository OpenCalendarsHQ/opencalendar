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

        {/* Working hours */}
        <SettingSection title="Werkuren highlighten" description="Markeer werkuren in dag- en weekweergave">
          <ToggleSwitch
            checked={settings.showWorkingHours}
            onChange={(checked) => updateSettings({ showWorkingHours: checked })}
          />
        </SettingSection>

        {/* Working hours range */}
        {settings.showWorkingHours && (
          <SettingSection title="Werkuren tijden" description="Begin en einde van werkuren">
            <div className="flex items-center gap-3">
              <select
                value={settings.workingHoursStart}
                onChange={(e) => updateSettings({ workingHoursStart: parseInt(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">tot</span>
              <select
                value={settings.workingHoursEnd}
                onChange={(e) => updateSettings({ workingHoursEnd: parseInt(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </SettingSection>
        )}

        {/* Day start/end hours */}
        <SettingSection title="Begin/eind van de dag" description="Eerste en laatste uur in dagweergave">
          <div className="flex items-center gap-3">
            <select
              value={settings.dayStartHour}
              onChange={(e) => updateSettings({ dayStartHour: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">tot</span>
            <select
              value={settings.dayEndHour}
              onChange={(e) => updateSettings({ dayEndHour: parseInt(e.target.value) })}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </SettingSection>

        {/* Time slot interval */}
        <SettingSection title="Tijdslot interval" description="Grootte van tijdslots in de weergave">
          <div className="flex gap-2">
            {([
              { value: 15 as const, label: "15 min" },
              { value: 30 as const, label: "30 min" },
              { value: 60 as const, label: "60 min" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.timeSlotInterval === opt.value}
                onClick={() => updateSettings({ timeSlotInterval: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Show weekends */}
        <SettingSection title="Weekenden tonen" description="Toon zaterdag en zondag in weekweergave">
          <ToggleSwitch
            checked={settings.showWeekends}
            onChange={(checked) => updateSettings({ showWeekends: checked })}
          />
        </SettingSection>

        {/* Event color source */}
        <SettingSection title="Event kleuren" description="Gebruik kalender- of event-kleur">
          <div className="flex gap-2">
            <OptionButton
              label="Van kalender"
              selected={settings.eventColorSource === "calendar"}
              onClick={() => updateSettings({ eventColorSource: "calendar" })}
            />
            <OptionButton
              label="Van event zelf"
              selected={settings.eventColorSource === "event"}
              onClick={() => updateSettings({ eventColorSource: "event" })}
            />
          </div>
        </SettingSection>

        {/* Show mini calendar */}
        <SettingSection title="Mini kalender" description="Toon mini maandkalender in sidebar">
          <ToggleSwitch
            checked={settings.showMiniCalendar}
            onChange={(checked) => updateSettings({ showMiniCalendar: checked })}
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
