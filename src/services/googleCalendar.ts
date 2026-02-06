// src/services/googleCalendar.ts
// Google Calendar API integration service

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Types
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  colorId?: string;
}

export interface GoogleCalendarList {
  kind: string;
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
    foregroundColor?: string;
    accessRole?: string;
  }>;
}

// Mapped event type for app compatibility
export interface MappedCalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  type: 'inspection' | 'meeting' | 'delivery' | 'site-visit' | 'deadline' | 'other';
  projectId?: string;
  attendeeIds: string[];
  createdBy: string;
  createdAt: string;
  googleEventId?: string;
  googleCalendarId?: string;
  htmlLink?: string;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_calendar_access_token',
  REFRESH_TOKEN: 'google_calendar_refresh_token',
  TOKEN_EXPIRY: 'google_calendar_token_expiry',
  CONNECTED: 'google_calendar_connected',
  SELECTED_CALENDAR: 'google_calendar_selected',
};

class GoogleCalendarService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.loadStoredTokens();
  }

  private loadStoredTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
    }
  }

  // Check if connected to Google Calendar
  isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.CONNECTED) === 'true' && !!this.accessToken;
  }

  // Get the selected calendar ID (defaults to 'primary')
  getSelectedCalendarId(): string {
    if (typeof window === 'undefined') return 'primary';
    return localStorage.getItem(STORAGE_KEYS.SELECTED_CALENDAR) || 'primary';
  }

  // Set the selected calendar ID
  setSelectedCalendarId(calendarId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CALENDAR, calendarId);
    }
  }

  // Store tokens after OAuth
  setTokens(accessToken: string, expiresIn: number, refreshToken?: string): void {
    this.accessToken = accessToken;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, this.tokenExpiry.toString());
      localStorage.setItem(STORAGE_KEYS.CONNECTED, 'true');
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    }
  }

  // Clear tokens (disconnect)
  clearTokens(): void {
    this.accessToken = null;
    this.tokenExpiry = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.CONNECTED);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CALENDAR);
    }
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // 1 minute buffer
  }

  // Get valid access token
  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) return null;
    
    // For now, just return the token. In production, you'd implement refresh logic here
    if (this.isTokenExpired()) {
      console.warn('Google Calendar token expired. Please reconnect.');
      return null;
    }
    
    return this.accessToken;
  }

  // Make authenticated API request
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  // Get list of user's calendars
  async getCalendarList(): Promise<GoogleCalendarList> {
    return this.apiRequest<GoogleCalendarList>('/users/me/calendarList');
  }

  // Get events from a calendar
  async getEvents(
    calendarId: string = 'primary',
    options: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      orderBy?: 'startTime' | 'updated';
      singleEvents?: boolean;
    } = {}
  ): Promise<{ items: GoogleCalendarEvent[] }> {
    const params = new URLSearchParams();
    
    if (options.timeMin) params.append('timeMin', options.timeMin);
    if (options.timeMax) params.append('timeMax', options.timeMax);
    if (options.maxResults) params.append('maxResults', options.maxResults.toString());
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.singleEvents !== undefined) params.append('singleEvents', options.singleEvents.toString());

    const queryString = params.toString();
    const endpoint = `/calendars/${encodeURIComponent(calendarId)}/events${queryString ? `?${queryString}` : ''}`;
    
    return this.apiRequest<{ items: GoogleCalendarEvent[] }>(endpoint);
  }

  // Create a new event
  async createEvent(
    calendarId: string = 'primary',
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );
  }

  // Update an event
  async updateEvent(
    calendarId: string = 'primary',
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(event),
      }
    );
  }

  // Delete an event
  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }

  // Map Google Calendar event to app format
  mapGoogleEventToAppEvent(
    event: GoogleCalendarEvent,
    currentUserId: string,
    calendarId: string
  ): MappedCalendarEvent {
    const startDateTime = event.start.dateTime || event.start.date || '';
    const endDateTime = event.end.dateTime || event.end.date || '';
    
    // Parse date and time
    let date = '';
    let startTime = '00:00';
    let endTime = '';

    if (event.start.dateTime) {
      const startDate = new Date(event.start.dateTime);
      date = startDate.toISOString().split('T')[0];
      startTime = startDate.toTimeString().slice(0, 5);
    } else if (event.start.date) {
      date = event.start.date;
    }

    if (event.end.dateTime) {
      const endDate = new Date(event.end.dateTime);
      endTime = endDate.toTimeString().slice(0, 5);
    }

    // Infer event type from summary/description
    const type = this.inferEventType(event.summary || '', event.description || '');

    return {
      id: `gcal_${event.id}`,
      title: event.summary || 'Untitled Event',
      description: event.description,
      date,
      startTime,
      endTime: endTime || undefined,
      location: event.location,
      type,
      projectId: undefined,
      attendeeIds: event.attendees?.map(a => a.email) || [],
      createdBy: event.creator?.email || currentUserId,
      createdAt: event.created || new Date().toISOString(),
      googleEventId: event.id,
      googleCalendarId: calendarId,
      htmlLink: event.htmlLink,
    };
  }

  // Infer event type from title/description
  private inferEventType(
    title: string,
    description: string
  ): MappedCalendarEvent['type'] {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('inspection') || text.includes('inspect')) return 'inspection';
    if (text.includes('meeting') || text.includes('call') || text.includes('sync')) return 'meeting';
    if (text.includes('delivery') || text.includes('deliver')) return 'delivery';
    if (text.includes('site') || text.includes('visit') || text.includes('tour')) return 'site-visit';
    if (text.includes('deadline') || text.includes('due') || text.includes('submit')) return 'deadline';
    
    return 'other';
  }

  // Map app event to Google Calendar format
  mapAppEventToGoogleEvent(
    event: Omit<MappedCalendarEvent, 'id' | 'createdAt' | 'googleEventId' | 'googleCalendarId' | 'htmlLink'>
  ): Partial<GoogleCalendarEvent> {
    const startDateTime = `${event.date}T${event.startTime}:00`;
    const endDateTime = event.endTime 
      ? `${event.date}T${event.endTime}:00`
      : `${event.date}T${event.startTime}:00`; // Default to same time if no end

    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();

// Export scopes for OAuth
export const GOOGLE_CALENDAR_SCOPES = SCOPES;