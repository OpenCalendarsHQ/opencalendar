import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { apiClient } from "./lib/api";
import { offlineCache } from "./lib/offline-cache";
import { syncManager } from "./lib/sync-manager";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import { MonthView } from "./components/calendar/month-view";
import { WeekView } from "./components/calendar/week-view";
import { DayView } from "./components/calendar/day-view";
import { YearView } from "./components/calendar/year-view";
import { EventDetailModal } from "./components/calendar/event-detail-modal";
import { EventEditModal } from "./components/calendar/event-edit-modal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { TaskBoard } from "./components/tasks/task-board";
import { TodayView } from "./components/views/today-view";
import { useRecurringEvents } from "./hooks/use-recurring-events";
import { Settings } from "lucide-react";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek as startOfWeekFn, 
  endOfWeek as endOfWeekFn,
  addDays
} from "date-fns";
import type { CalendarEvent, CalendarGroup, CalendarViewType } from "./lib/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Check for updates on app startup (alleen in productie, stille fout als endpoint niet bereikbaar)
async function checkForUpdates() {
  if (!import.meta.env.PROD) return; // Skip in dev-modus
  try {
    const update = await check();
    if (update) {
      console.log(`Update beschikbaar: v${update.version}`);
    }
  } catch {
    // Stil negeren: endpoint niet bereikbaar of geen geldige release (bijv. lokaal/development)
  }
}

function App() {
  const { user, isAuthenticated, isLoading, logout, login } = useAuth();

  // Check for updates on app startup
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Listen for deep link events
  useEffect(() => {
    const unlisten = listen<string[]>("deep-link://new-url", (event) => {
      const urls = event.payload;
      console.log("Deep link received in frontend:", urls);

      // Parse the URL: opencalendar://auth-callback?token=...&refresh_token=...&user_id=...&email=...
      if (urls && urls.length > 0) {
        const url = urls[0];
        console.log("Processing deep link URL:", url);

        if (url.includes("auth-callback")) {
          try {
            // Robuuste parsing: new URL() faalt soms met custom schemes (opencalendar://)
            const queryStart = url.indexOf("?");
            const params = queryStart >= 0 ? new URLSearchParams(url.substring(queryStart + 1)) : new URLSearchParams();

            const token = params.get("token");
            const refreshToken = params.get("refresh_token");
            const userId = params.get("user_id");
            const email = params.get("email");
            const name = params.get("name");
            const image = params.get("image");

            console.log("Deep link params:", { token: token?.substring(0, 20) + "...", refreshToken: refreshToken?.substring(0, 20) + "...", userId, email, name });

            if (token && refreshToken && userId && email) {
              console.log("Logging in with deep link credentials...");
              login(
                { token, refreshToken },
                { id: userId, email, name: name || undefined, image: image || undefined }
              );
            } else {
              console.error("Missing required parameters in deep link");
            }
          } catch (error) {
            console.error("Failed to parse deep link:", error);
          }
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [login]);

  async function handleLogin() {
    try {
      // Use Tauri's opener plugin to open the browser
      await invoke("plugin:opener|open_url", {
        url: `${API_URL}/auth/desktop-login`
      });
    } catch (error) {
      console.error("Failed to open browser:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-lg">OpenCalendars wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="bg-card rounded-lg border border-border shadow-sm p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-semibold text-foreground mb-2">OpenCalendars</h1>
          <p className="text-muted-foreground mb-6 text-sm">Log in om je agenda's te bekijken</p>
          <button
            onClick={handleLogin}
            className="w-full bg-accent text-accent-foreground font-medium py-2.5 px-4 rounded-md hover:bg-accent-hover transition-colors"
          >
            Inloggen met Browser
          </button>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Er wordt een browser geopend voor authenticatie
          </p>
        </div>
      </div>
    );
  }

  return <CalendarApp user={user} logout={logout} />;
}

// Separate CalendarApp component to handle calendar state
function CalendarApp(props: { user: any; logout: () => void }) {
  const [mainView, setMainView] = useState<"calendar" | "tasks" | "today">("calendar");
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const hasInitialized = useRef(false);

  // Date range for expansion
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewType === "day") {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else if (viewType === "week") {
      start = startOfWeekFn(currentDate, { weekStartsOn: 1 });
      end = endOfWeekFn(currentDate, { weekStartsOn: 1 });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeekFn(monthStart, { weekStartsOn: 1 });
      end = endOfWeekFn(monthEnd, { weekStartsOn: 1 });
    }

    return {
      start: addDays(start, -7),
      end: addDays(end, 7),
    };
  }, [currentDate, viewType]);

  const expandedEvents = useRecurringEvents(rawEvents, dateRange.start, dateRange.end);

  const fetchEvents = useCallback(async () => {
    const now = new Date();
    const startOfMonthDate = startOfMonth(now);
    const endOfMonthDate = addDays(endOfMonth(now), 31); // Fetch a few months range

    try {
      const eventsData = await apiClient.getEvents(startOfMonthDate, endOfMonthDate);
      // Save to offline cache
      offlineCache.saveEvents(eventsData);
      setRawEvents(eventsData);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    try {
      const accounts = await apiClient.getCalendars();
      // Save to offline cache
      offlineCache.saveCalendars(accounts);

      const groups: CalendarGroup[] = accounts.map((account: any) => ({
        id: account.id,
        provider: account.provider as any,
        email: account.email,
        calendars: (account.calendars || []).map((cal: any) => ({
          id: cal.id,
          name: cal.name,
          color: cal.color || "#737373",
          isVisible: cal.isVisible !== false,
          isReadOnly: cal.isReadOnly || false,
        })),
      }));
      setCalendarGroups(groups);
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    // Try to load from cache first (offline-first approach)
    const cachedCalendars = offlineCache.getCalendars();
    const cachedEvents = offlineCache.getEvents();

    if (cachedCalendars && cachedEvents) {
      console.log("📦 Loading from offline cache");
      const groups = cachedCalendars.map((account: any) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        calendars: (account.calendars || []).map((cal: any) => ({
          id: cal.id,
          name: cal.name,
          color: cal.color || "#737373",
          isVisible: cal.isVisible !== false,
          isReadOnly: cal.isReadOnly || false,
        })),
      }));
      setCalendarGroups(groups);
      setRawEvents(cachedEvents);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // Fetch fresh data in background
    try {
      console.log("🔄 Fetching fresh data from server");
      await Promise.all([fetchCalendars(), fetchEvents()]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      if (!cachedCalendars || !cachedEvents) {
        alert("Kan geen verbinding maken met de server. Controleer je internetverbinding.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchCalendars, fetchEvents]);

  // Fetch calendars and events once when user authenticates
  useEffect(() => {
    if (props.user?.id && !hasInitialized.current) {
      hasInitialized.current = true;
      console.log("User authenticated, fetching data...");

      // Start sync manager for offline support
      syncManager.startAutoSync();

      fetchData();
    }

    // Cleanup on unmount
    return () => {
      syncManager.stopAutoSync();
    };
  }, [props.user?.id, fetchData]);

  // Navigation handlers - memoized to prevent unnecessary re-renders
  const handleNavigateBack = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewType === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewType === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewType]);

  const handleNavigateForward = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewType === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewType === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewType]);

  const handleNavigateToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleToggleCalendar = useCallback(async (calendarId: string) => {
    // Find the calendar and toggle its visibility
    setCalendarGroups((prevGroups) => {
      const updatedGroups = prevGroups.map((group) => ({
        ...group,
        calendars: group.calendars.map((cal) =>
          cal.id === calendarId ? { ...cal, isVisible: !cal.isVisible } : cal
        ),
      }));

      // Persist to backend asynchronously
      const calendar = updatedGroups
        .flatMap((g) => g.calendars)
        .find((c) => c.id === calendarId);

      if (calendar) {
        apiClient.updateCalendar({ id: calendarId, isVisible: calendar.isVisible })
          .catch((error) => {
            console.error("Failed to toggle calendar visibility:", error);
            // Revert on error by setting back to previous groups
            setCalendarGroups(prevGroups);
          });
      }

      return updatedGroups;
    });
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  }, []);

  const handleCreateEvent = useCallback(() => {
    setSelectedEvent(null);
    setIsNewEvent(true);
    setIsEditModalOpen(true);
  }, []);

  const handleEventSaved = useCallback(() => {
    fetchEvents();
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  }, []);

  // Filter events based on visible calendars - memoized for performance
  const visibleEvents = useMemo(() => {
    const visibleCalendarIds = new Set(
      calendarGroups
        .flatMap((g) => g.calendars)
        .filter((c) => c.isVisible)
        .map((c) => c.id)
    );
    return expandedEvents.filter((event) => visibleCalendarIds.has(event.calendarId));
  }, [expandedEvents, calendarGroups]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">Kalenders laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - only show in calendar view */}
      {mainView === "calendar" && (
        <Sidebar
          selectedDate={selectedDate}
          onDateSelect={handleDayClick}
          calendarGroups={calendarGroups}
          onToggleCalendar={handleToggleCalendar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with navigation */}
        <div className="bg-background border-b border-border">
          {/* Main view tabs */}
          <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) items-center justify-between gap-1 px-4 pt-3 border-b border-border">
            <div className="flex items-center gap-1">
            <button
              onClick={() => setMainView("today")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mainView === "today"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Vandaag
            </button>
            <button
              onClick={() => setMainView("calendar")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mainView === "calendar"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Kalender
            </button>
            <button
              onClick={() => setMainView("tasks")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mainView === "tasks"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Taken
            </button>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Instellingen"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Header - only show in calendar view */}
          {mainView === "calendar" && (
            <Header
              currentDate={currentDate}
              viewType={viewType}
              onViewTypeChange={setViewType}
              onNavigateBack={handleNavigateBack}
              onNavigateForward={handleNavigateForward}
              onNavigateToday={handleNavigateToday}
              onSync={fetchEvents}
            />
          )}
        </div>

        {/* View content */}
        <div className="flex-1 overflow-auto bg-background">
          {mainView === "today" && (
            <TodayView
              events={visibleEvents}
              onEventClick={handleEventClick}
            />
          )}

          {mainView === "calendar" && (
            <>
              {viewType === "month" && (
                <MonthView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewType === "week" && (
                <WeekView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewType === "day" && (
                <DayView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onEventClick={handleEventClick}
                />
              )}
              {viewType === "year" && (
                <YearView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onDayClick={handleDayClick}
                />
              )}
            </>
          )}

          {mainView === "tasks" && <TaskBoard />}
        </div>

        {/* Floating action button for creating events */}
        {mainView === "calendar" && (
        <button
          onClick={handleCreateEvent}
          className="fixed bottom-8 right-8 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-accent-hover transition-all hover:scale-110 flex items-center justify-center"
            title="Nieuw evenement"
          >
            <span className="text-2xl leading-none">+</span>
          </button>
        )}
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      {/* Event Edit Modal */}
      <EventEditModal
        event={selectedEvent}
        isOpen={isEditModalOpen}
        isNew={isNewEvent}
        calendarGroups={calendarGroups}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEvent(null);
          setIsNewEvent(false);
        }}
        onSave={handleEventSaved}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
