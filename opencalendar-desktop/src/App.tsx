import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { apiClient } from "./lib/api";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import { MonthView } from "./components/calendar/month-view";
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
function CalendarApp(_props: { user: any; logout: () => void }) {
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarGroups, setCalendarGroups] = useState<CalendarGroup[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch calendars and events on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      await Promise.all([fetchCalendars(), fetchEvents()]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCalendars() {
    const calendars = await apiClient.getCalendars();
    // Group calendars by account
    const grouped = calendars.reduce((acc: Map<string, CalendarGroup>, cal: any) => {
      const key = `${cal.accountId}`;
      const existing = acc.get(key);
      if (existing) {
        existing.calendars.push({
          id: cal.id,
          name: cal.name,
          color: cal.color || "#737373",
          isVisible: cal.isVisible,
          isReadOnly: cal.isReadOnly,
        });
      } else {
        acc.set(key, {
          id: cal.accountId,
          provider: cal.provider as any,
          email: cal.accountEmail || cal.provider,
          calendars: [{
            id: cal.id,
            name: cal.name,
            color: cal.color || "#737373",
            isVisible: cal.isVisible,
            isReadOnly: cal.isReadOnly,
          }],
        });
      }
      return acc;
    }, new Map<string, CalendarGroup>());

    setCalendarGroups(Array.from(grouped.values()));
  }

  async function fetchEvents() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const eventsData = await apiClient.getEvents(startOfMonth, endOfMonth);
    setEvents(eventsData.map((e: any) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      color: e.color || "#737373",
    })));
  }

  // Navigation handlers
  function handleNavigateBack() {
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
  }

  function handleNavigateForward() {
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
  }

  function handleNavigateToday() {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }

  function handleToggleCalendar(calendarId: string) {
    // TODO: Implement toggle calendar visibility
    console.log("Toggle calendar:", calendarId);
  }

  function handleEventClick(event: CalendarEvent) {
    console.log("Event clicked:", event);
    // TODO: Open event detail dialog
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setCurrentDate(date);
  }

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
              events={events}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
          {viewType !== "month" && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">
                {viewType === "day" && "Dagweergave komt binnenkort..."}
                {viewType === "week" && "Weekweergave komt binnenkort..."}
                {viewType === "year" && "Jaarweergave komt binnenkort..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
