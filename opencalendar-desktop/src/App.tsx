import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { apiClient } from "./lib/api";
import { offlineCache } from "./lib/offline-cache";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import { MonthView } from "./components/calendar/month-view";
import { WeekView } from "./components/calendar/week-view";
import { DayView } from "./components/calendar/day-view";
import { YearView } from "./components/calendar/year-view";
import { EventDetailModal } from "./components/calendar/event-detail-modal";
import type { CalendarEvent, CalendarGroup, CalendarViewType } from "./lib/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const { user, isAuthenticated, isLoading, logout, login } = useAuth();

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
            // Handle both with and without trailing slash: auth-callback/ or auth-callback
            const urlObj = new URL(url.replace("auth-callback/", "auth-callback"));
            console.log("Parsed URL:", urlObj.toString());

            const token = urlObj.searchParams.get("token");
            const refreshToken = urlObj.searchParams.get("refresh_token");
            const userId = urlObj.searchParams.get("user_id");
            const email = urlObj.searchParams.get("email");
            const name = urlObj.searchParams.get("name");
            const image = urlObj.searchParams.get("image");

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
          <p className="text-neutral-600 text-lg">OpenCalendar wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">OpenCalendar</h1>
          <p className="text-neutral-600 mb-6 text-sm">Log in om je agenda's te bekijken</p>
          <button
            onClick={handleLogin}
            className="w-full bg-neutral-900 text-white font-medium py-2.5 px-4 rounded-md hover:bg-neutral-800 transition-colors"
          >
            Inloggen met Browser
          </button>
          <p className="mt-4 text-xs text-neutral-500 text-center">
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
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasInitialized = useRef(false);

  // Fetch calendars and events once when user authenticates
  useEffect(() => {
    if (props.user?.id && !hasInitialized.current) {
      hasInitialized.current = true;
      console.log("User authenticated, fetching data...");
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.user?.id]); // Only re-run if user ID changes (i.e., login/logout)

  async function fetchData() {
    // Try to load from cache first (offline-first approach)
    const cachedCalendars = offlineCache.getCalendars();
    const cachedEvents = offlineCache.getEvents();

    if (cachedCalendars && cachedEvents) {
      console.log("📦 Loading from offline cache");
      // Load cached data immediately
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
      setEvents(cachedEvents.map((e: any) => ({
        ...e,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
      })));
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
      // If we have cache, we're OK (offline mode)
      if (!cachedCalendars || !cachedEvents) {
        // No cache and network failed - show error
        alert("Kan geen verbinding maken met de server. Controleer je internetverbinding.");
      } else {
        console.log("✅ Using offline cache due to network error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCalendars() {
    const accounts = await apiClient.getCalendars();
    console.log("Fetched calendar accounts:", accounts);

    // Save to offline cache
    offlineCache.saveCalendars(accounts);

    // API returns array of accounts with nested calendars
    const groups: CalendarGroup[] = accounts.map((account: any) => ({
      id: account.id,
      provider: account.provider as any,
      email: account.email,
      calendars: (account.calendars || []).map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        color: cal.color || "#737373",
        isVisible: cal.isVisible !== false, // Default to true if undefined
        isReadOnly: cal.isReadOnly || false,
      })),
    }));

    console.log("Processed calendar groups:", groups);
    setCalendarGroups(groups);
  }

  async function fetchEvents() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const eventsData = await apiClient.getEvents(startOfMonth, endOfMonth);

    // Save to offline cache
    offlineCache.saveEvents(eventsData);

    setEvents(eventsData.map((e: any) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      color: e.color || "#737373",
    })));
  }

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
    setIsModalOpen(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  }, []);

  // Filter events based on visible calendars - memoized for performance
  // MUST be before early return to follow Rules of Hooks
  const visibleEvents = useMemo(() => {
    const visibleCalendarIds = new Set(
      calendarGroups
        .flatMap((g) => g.calendars)
        .filter((c) => c.isVisible)
        .map((c) => c.id)
    );
    return events.filter((event) => visibleCalendarIds.has(event.calendarId));
  }, [events, calendarGroups]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Kalenders laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        selectedDate={selectedDate}
        onDateSelect={handleDayClick}
        calendarGroups={calendarGroups}
        onToggleCalendar={handleToggleCalendar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          currentDate={currentDate}
          viewType={viewType}
          onViewTypeChange={setViewType}
          onNavigateBack={handleNavigateBack}
          onNavigateForward={handleNavigateForward}
          onNavigateToday={handleNavigateToday}
          onSync={fetchEvents}
        />

        {/* Calendar view */}
        <div className="flex-1 overflow-auto bg-white">
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
        </div>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}

export default App;
