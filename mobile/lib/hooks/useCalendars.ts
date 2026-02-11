import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isReadOnly: boolean;
  isPrimary: boolean;
}

export interface CalendarAccount {
  id: string;
  provider: string;
  email: string;
  lastSyncAt: string | null;
  isActive: boolean;
  calendars: Calendar[];
}

export function useCalendars() {
  const [calendars, setCalendars] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCalendars();
      setCalendars(data);
    } catch (err: any) {
      console.error('Failed to fetch calendars:', err);
      setError(err.message || 'Failed to load calendars');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCalendar = useCallback(async (name: string, color?: string) => {
    try {
      await apiClient.createCalendar({ name, color });
      await fetchCalendars();
    } catch (err: any) {
      console.error('Failed to create calendar:', err);
      throw err;
    }
  }, [fetchCalendars]);

  const updateCalendar = useCallback(async (
    id: string,
    updates: { name?: string; color?: string; isVisible?: boolean }
  ) => {
    try {
      await apiClient.updateCalendar({ id, ...updates });
      await fetchCalendars();
    } catch (err: any) {
      console.error('Failed to update calendar:', err);
      throw err;
    }
  }, [fetchCalendars]);

  const deleteCalendar = useCallback(async (calendarId: string) => {
    try {
      await apiClient.deleteCalendar(calendarId);
      await fetchCalendars();
    } catch (err: any) {
      console.error('Failed to delete calendar:', err);
      throw err;
    }
  }, [fetchCalendars]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return {
    calendars,
    loading,
    error,
    refetch: fetchCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
  };
}
