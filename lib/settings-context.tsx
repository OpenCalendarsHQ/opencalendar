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
  language: "nl" | "en";
  showWeekNumbers: boolean;
  defaultView: "day" | "week" | "month" | "year";
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

  // Event display customization
  eventBorderStyle: "solid" | "dashed" | "dotted" | "none";
  eventBorderWidth: 1 | 2 | 3 | 4;
  eventCornerRadius: 0 | 2 | 4 | 6 | 8 | 12;
  eventOpacity: 60 | 70 | 80 | 90 | 100;
  eventFontSize: "xs" | "sm" | "base";
  eventPadding: "tight" | "normal" | "relaxed";
  showLocationIcon: boolean;
  showTimeInCompact: boolean;
  eventBackgroundStyle: "solid" | "gradient" | "glass";
  eventShadow: "none" | "sm" | "md";
  showEventBorder: boolean;
  eventTitleWeight: "normal" | "medium" | "semibold" | "bold";
  eventTextAlignment: "left" | "center" | "right";

  // Notifications (for later)
  defaultReminders: number[]; // minutes before event: [15, 60, 1440]
  enableNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Basic display
  weekStartsOn: 1, // Monday (European default)
  timeFormat: "24h",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam",
  language: "nl",
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

  // Event display customization
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
  eventTextAlignment: "left",

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

export const SettingsContext = createContext<SettingsContextValue | null>(null);

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
        } else if (res.status === 401) {
          // Not authenticated - silently use defaults (e.g., on landing/welcome page)
          // Don't log error, this is expected when not logged in
        } else {
          // Log error for unexpected status codes, but don't try to parse response as JSON
          console.error("Failed to load settings: HTTP", res.status);
        }
      } catch (error) {
        // Only log network errors or JSON parse errors from successful responses
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

      // Debounce database save (150ms for faster feedback)
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(async () => {
        try {
          // If language changed, set the cookie for next-intl
          if (partial.language) {
            document.cookie = `NEXT_LOCALE=${partial.language}; path=/; max-age=31536000; SameSite=Lax`;
          }

          await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });

          // If language changed, reload to apply changes
          if (partial.language) {
            window.location.reload();
          }
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      }, 150);

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
