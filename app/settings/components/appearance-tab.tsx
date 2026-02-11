"use client";

import { useSettings } from "@/lib/settings-context";
import { SettingSection, OptionButton, ToggleSwitch } from "./setting-helpers";
import { EventPreview } from "./event-preview";
import { Palette, RotateCcw } from "lucide-react";

export function AppearanceTab() {
  const { settings, updateSettings } = useSettings();

  const resetEventDisplaySettings = () => {
    updateSettings({
      eventBorderStyle: "solid",
      eventBorderWidth: 3,
      eventCornerRadius: 4,
      eventOpacity: 100,
      eventFontSize: "sm",
      eventPadding: "normal",
      showLocationIcon: true,
      showTimeInCompact: true,
      eventBackgroundStyle: "solid",
      eventShadow: "none",
      showEventBorder: true,
      eventTitleWeight: "medium",
    });
  };

  return (
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

      {/* Event Display Customization Section */}
      <div className="my-8 border-t border-border pt-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-foreground" />
            <h3 className="text-base font-semibold text-foreground">Event Weergave Aanpassen</h3>
          </div>
          <button
            onClick={resetEventDisplaySettings}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            title="Terugzetten naar standaard"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Standaard
          </button>
        </div>

        {/* Preview */}
        <div className="mb-6">
          <EventPreview />
        </div>

        {/* Event Background Style */}
        <SettingSection title="Achtergrond stijl" description="Stijl van event achtergrond">
          <div className="flex gap-2">
            {([
              { value: "solid" as const, label: "Solid" },
              { value: "gradient" as const, label: "Gradient" },
              { value: "glass" as const, label: "Glass" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventBackgroundStyle === opt.value}
                onClick={() => updateSettings({ eventBackgroundStyle: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Border Style */}
        <SettingSection title="Rand weergave" description="Toon rand rondom events">
          <ToggleSwitch
            checked={settings.showEventBorder}
            onChange={(checked) => updateSettings({ showEventBorder: checked })}
          />
        </SettingSection>

        {settings.showEventBorder && (
          <>
            <SettingSection title="Rand stijl" description="Stijl van event rand">
              <div className="flex gap-2">
                {([
                  { value: "solid" as const, label: "Solid" },
                  { value: "dashed" as const, label: "Dashed" },
                  { value: "dotted" as const, label: "Dotted" },
                ]).map((opt) => (
                  <OptionButton
                    key={opt.value}
                    label={opt.label}
                    selected={settings.eventBorderStyle === opt.value}
                    onClick={() => updateSettings({ eventBorderStyle: opt.value })}
                  />
                ))}
              </div>
            </SettingSection>

            <SettingSection title="Rand dikte" description="Dikte van linker rand">
              <div className="flex gap-2">
                {([
                  { value: 1 as const, label: "1px" },
                  { value: 2 as const, label: "2px" },
                  { value: 3 as const, label: "3px" },
                  { value: 4 as const, label: "4px" },
                ]).map((opt) => (
                  <OptionButton
                    key={opt.value}
                    label={opt.label}
                    selected={settings.eventBorderWidth === opt.value}
                    onClick={() => updateSettings({ eventBorderWidth: opt.value })}
                  />
                ))}
              </div>
            </SettingSection>
          </>
        )}

        {/* Event Corner Radius */}
        <SettingSection title="Hoek afronding" description="Ronde hoeken van events">
          <div className="flex flex-wrap gap-2">
            {([
              { value: 0 as const, label: "Geen" },
              { value: 2 as const, label: "Klein" },
              { value: 4 as const, label: "Normaal" },
              { value: 6 as const, label: "Medium" },
              { value: 8 as const, label: "Groot" },
              { value: 12 as const, label: "Extra" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventCornerRadius === opt.value}
                onClick={() => updateSettings({ eventCornerRadius: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Shadow */}
        <SettingSection title="Schaduw" description="Schaduw onder events">
          <div className="flex gap-2">
            {([
              { value: "none" as const, label: "Geen" },
              { value: "sm" as const, label: "Klein" },
              { value: "md" as const, label: "Medium" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventShadow === opt.value}
                onClick={() => updateSettings({ eventShadow: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Opacity */}
        <SettingSection title="Transparantie" description="Doorzichtigheid van event achtergrond">
          <div className="flex flex-wrap gap-2">
            {([
              { value: 60 as const, label: "60%" },
              { value: 70 as const, label: "70%" },
              { value: 80 as const, label: "80%" },
              { value: 90 as const, label: "90%" },
              { value: 100 as const, label: "100%" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventOpacity === opt.value}
                onClick={() => updateSettings({ eventOpacity: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Font Size */}
        <SettingSection title="Lettergrootte" description="Grootte van event tekst">
          <div className="flex gap-2">
            {([
              { value: "xs" as const, label: "Klein" },
              { value: "sm" as const, label: "Normaal" },
              { value: "base" as const, label: "Groot" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventFontSize === opt.value}
                onClick={() => updateSettings({ eventFontSize: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Title Weight */}
        <SettingSection title="Titel dikte" description="Dikte van event titel">
          <div className="flex gap-2">
            {([
              { value: "normal" as const, label: "Normaal" },
              { value: "medium" as const, label: "Medium" },
              { value: "semibold" as const, label: "Semibold" },
              { value: "bold" as const, label: "Bold" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventTitleWeight === opt.value}
                onClick={() => updateSettings({ eventTitleWeight: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Event Padding */}
        <SettingSection title="Binnen ruimte" description="Ruimte binnen events">
          <div className="flex gap-2">
            {([
              { value: "tight" as const, label: "Krap" },
              { value: "normal" as const, label: "Normaal" },
              { value: "relaxed" as const, label: "Ruim" },
            ]).map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={settings.eventPadding === opt.value}
                onClick={() => updateSettings({ eventPadding: opt.value })}
              />
            ))}
          </div>
        </SettingSection>

        {/* Show Location Icon */}
        <SettingSection title="Locatie icoon" description="Toon locatie icoon in events">
          <ToggleSwitch
            checked={settings.showLocationIcon}
            onChange={(checked) => updateSettings({ showLocationIcon: checked })}
          />
        </SettingSection>

        {/* Show Time in Compact */}
        <SettingSection title="Tijd in compacte weergave" description="Toon tijd bij korte events">
          <ToggleSwitch
            checked={settings.showTimeInCompact}
            onChange={(checked) => updateSettings({ showTimeInCompact: checked })}
          />
        </SettingSection>
      </div>

      {/* Show mini calendar */}
      <SettingSection title="Mini kalender" description="Toon mini maandkalender in sidebar">
        <ToggleSwitch
          checked={settings.showMiniCalendar}
          onChange={(checked) => updateSettings({ showMiniCalendar: checked })}
        />
      </SettingSection>
    </div>
  );
}
