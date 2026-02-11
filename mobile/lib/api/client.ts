import * as SecureStore from 'expo-secure-store';

// Change this to your API URL
// For local development: http://10.0.2.2:3000 (Android emulator) or http://localhost:3000 (iOS simulator)
// For production: https://your-domain.com
const API_URL = __DEV__
  ? 'http://localhost:3000'  // Change to your local IP for physical devices: http://192.168.x.x:3000
  : 'https://opencalendars.app';

export interface ApiError {
  error: string;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ========== Calendars ==========
  async getCalendars() {
    return this.request<any[]>('/api/calendars');
  }

  async createCalendar(data: { name: string; color?: string }) {
    return this.request('/api/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(data: { id: string; name?: string; color?: string; isVisible?: boolean }) {
    return this.request('/api/calendars', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendar(calendarId: string) {
    return this.request(`/api/calendars?calendarId=${calendarId}`, {
      method: 'DELETE',
    });
  }

  async deleteAccount(accountId: string) {
    return this.request(`/api/calendars?accountId=${accountId}`, {
      method: 'DELETE',
    });
  }

  // ========== Events ==========
  async getEvents(params: { start: string; end: string; calendarId?: string }) {
    const queryParams = new URLSearchParams({
      start: params.start,
      end: params.end,
      ...(params.calendarId && { calendarId: params.calendarId }),
    });
    return this.request<any[]>(`/api/events?${queryParams}`);
  }

  async createEvent(data: {
    calendarId?: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    rrule?: string;
    isRecurring?: boolean;
  }) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(data: {
    id: string;
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    calendarId?: string;
    rrule?: string;
    isRecurring?: boolean;
  }) {
    return this.request('/api/events', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/api/events?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Tasks ==========
  async getTasks(params?: { calendarId?: string }) {
    const queryParams = params?.calendarId
      ? `?calendarId=${params.calendarId}`
      : '';
    return this.request<any[]>(`/api/tasks${queryParams}`);
  }

  async createTask(data: {
    calendarId?: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: 'todo' | 'in_progress' | 'done';
  }) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(data: {
    id: string;
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: 'todo' | 'in_progress' | 'done';
    calendarId?: string;
  }) {
    return this.request('/api/tasks', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/api/tasks?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Settings ==========
  async getSettings() {
    return this.request<any>('/api/settings');
  }

  async updateSettings(data: any) {
    return this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
