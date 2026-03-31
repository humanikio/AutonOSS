import apiClient from './client';

export type EventType = 'meeting' | 'call' | 'video' | 'task' | 'reminder' | 'appointment';

export interface AttendeeInput {
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface CalendarEvent {
  eventId: string;
  calendarId: string;
  tenantId: string;
  eventName: string;
  eventType: EventType;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: AttendeeInput[];
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  status?: 'completed' | 'active';
  completedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  eventName: string;
  eventType: EventType;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: AttendeeInput[];
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

export interface UpdateEventRequest {
  eventName?: string;
  eventType?: EventType;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees?: AttendeeInput[];
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

export const eventsAPI = {
  // Get all events for a calendar
  async getEvents(calendarId: string): Promise<CalendarEvent[]> {
    const response = await apiClient.get(`/api/calendars/${calendarId}/events`);
    return response.data.data || [];
  },

  // Get a specific event
  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const response = await apiClient.get(`/api/calendars/${calendarId}/events/${eventId}`);
    return response.data.data;
  },

  // Create a new event
  async createEvent(calendarId: string, data: CreateEventRequest): Promise<CalendarEvent> {
    const response = await apiClient.post(`/api/calendars/${calendarId}/events`, data);
    return response.data.data;
  },

  // Update an existing event
  async updateEvent(
    calendarId: string,
    eventId: string,
    data: UpdateEventRequest
  ): Promise<CalendarEvent> {
    const response = await apiClient.put(`/api/calendars/${calendarId}/events/${eventId}`, data);
    return response.data.data;
  },

  // Delete an event
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await apiClient.delete(`/api/calendars/${calendarId}/events/${eventId}`);
  }
};
