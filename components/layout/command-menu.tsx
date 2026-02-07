"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Calendar, Plus, Search, Settings, CheckSquare, Clock } from "lucide-react";

interface CommandMenuProps {
  onCreateEvent: () => void;
  onNavigateToSettings: () => void;
  onNavigateToday: () => void;
  onNavigateToTasks?: () => void;
  onNavigateToFocus?: () => void;
}

const itemClass = "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-muted";

export function CommandMenu({ onCreateEvent, onNavigateToSettings, onNavigateToday, onNavigateToTasks, onNavigateToFocus }: CommandMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((p) => !p); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div className="fixed inset-0 bg-black/20" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
        <Command className="flex flex-col">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <Command.Input placeholder="Zoeken..."
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <Command.List className="max-h-[240px] overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">Geen resultaten.</Command.Empty>
            <Command.Group heading="Acties" className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item onSelect={() => { onCreateEvent(); setOpen(false); }} className={itemClass}>
                <Plus className="h-3.5 w-3.5" /> Nieuw evenement
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToday(); setOpen(false); }} className={itemClass}>
                <Calendar className="h-3.5 w-3.5" /> Vandaag
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Navigatie" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item onSelect={() => { onNavigateToTasks?.(); setOpen(false); }} className={itemClass}>
                <CheckSquare className="h-3.5 w-3.5" /> Taken
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToFocus?.(); setOpen(false); }} className={itemClass}>
                <Clock className="h-3.5 w-3.5" /> Vandaag overzicht
              </Command.Item>
              <Command.Item onSelect={() => { onNavigateToSettings(); setOpen(false); }} className={itemClass}>
                <Settings className="h-3.5 w-3.5" /> Instellingen
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">↑↓</kbd> navigeren</span>
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">↵</kbd> selecteren</span>
            <span><kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">esc</kbd> sluiten</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
