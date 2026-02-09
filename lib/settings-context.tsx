"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSettings({ ...DEFAULT_SETTINGS, ...data });
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };

      // Debounce database save (500ms)
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      }, 500);

      return next;
    });
  }, []);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_SETTINGS),
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoading }}>
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
