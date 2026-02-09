"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface AppSettings {
  // Basic display
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  timeFormat: "24h" | "12h";
  timezone: string;
  showWeekNumbers: boolean;
  defaultView: "day" | "week" | "month";
  defaultEventDuration: 30 | 60 | 90 | 120; // minutes
  showDeclinedEvents: boolean;

  // Theme & appearance
  theme: "light" | "dark" | "auto";
  colorScheme: "default" | "blue" | "purple" | "green" | "orange";
  compactMode: boolean;

  // Working hours & time slots
  showWorkingHours: boolean;
  workingHoursStart: number; // 0-23 (hour)
  workingHoursEnd: number; // 0-23 (hour)
  dayStartHour: number; // 0-23 (start of visible day)
  dayEndHour: number; // 0-23 (end of visible day)
  timeSlotInterval: 15 | 30 | 60; // minutes
  showWeekends: boolean;

  // Calendar preferences
  defaultCalendarId: string | null;
  eventColorSource: "calendar" | "event"; // Use calendar color or event's own color
  showMiniCalendar: boolean;

  // Notifications (for later)
  defaultReminders: number[]; // minutes before event: [15, 60, 1440]
  enableNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Basic display
  weekStartsOn: 1, // Monday (European default)
  timeFormat: "24h",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam",
  showWeekNumbers: false,
  defaultView: "week",
  defaultEventDuration: 60,
  showDeclinedEvents: false,

  // Theme & appearance
  theme: "auto",
  colorScheme: "default",
  compactMode: false,

  // Working hours & time slots
  showWorkingHours: true,
  workingHoursStart: 9,
  workingHoursEnd: 17,
  dayStartHour: 6,
  dayEndHour: 22,
  timeSlotInterval: 30,
  showWeekends: true,

  // Calendar preferences
  defaultCalendarId: null,
  eventColorSource: "calendar",
  showMiniCalendar: true,

  // Notifications (for later)
  defaultReminders: [15, 60], // 15 min and 1 hour before
  enableNotifications: false,
};

const STORAGE_KEY = "opencalendar-settings";

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // corrupt localStorage
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
