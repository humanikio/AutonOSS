import apiClient from './client';

// Types match backend
export interface AttendeeResponse {
  attendeeId: string;
  calendarId: string;
  eventId: string;
  tenantId: string;
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role: 'organizer' | 'attendee' | 'optional';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AddAttendeeRequest {
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
  metadata?: Record<string, any>;
}

export interface UpdateAttendeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'organizer' | 'attendee' | 'optional';
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
  metadata?: Record<string, any>;
}

/**
 * Attendees API Service
 * Direct CRUD operations for event attendees
 * Use these for quick add/remove/update actions
 */
export const attendeesAPI = {

  /**
   * Get all attendees for an event
   */
  async getAttendees(
    calendarId: string,
    eventId: string
  ): Promise<AttendeeResponse[]> {
    const response = await apiClient.get(
      `/api/calendars/${calendarId}/events/${eventId}/attendees`
    );
    return response.data.data;
  },

  /**
   * Get a single attendee
   */
  async getAttendee(
    calendarId: string,
    eventId: string,
    attendeeId: string
  ): Promise<AttendeeResponse> {
    const response = await apiClient.get(
      `/api/calendars/${calendarId}/events/${eventId}/attendees/${attendeeId}`
    );
    return response.data.data;
  },

  /**
   * Add one or more attendees to an event
   * Can pass single object or array
   */
  async addAttendees(
    calendarId: string,
    eventId: string,
    attendees: AddAttendeeRequest | AddAttendeeRequest[]
  ): Promise<AttendeeResponse[]> {
    const response = await apiClient.post(
      `/api/calendars/${calendarId}/events/${eventId}/attendees`,
      attendees
    );
    // Backend returns array or single object, normalize to array
    const data = response.data.data;
    return Array.isArray(data) ? data : [data];
  },

  /**
   * Update an attendee (e.g., change status from pending to accepted)
   */
  async updateAttendee(
    calendarId: string,
    eventId: string,
    attendeeId: string,
    updates: UpdateAttendeeRequest
  ): Promise<AttendeeResponse> {
    const response = await apiClient.patch(
      `/api/calendars/${calendarId}/events/${eventId}/attendees/${attendeeId}`,
      updates
    );
    return response.data.data;
  },

  /**
   * Remove an attendee from an event
   */
  async removeAttendee(
    calendarId: string,
    eventId: string,
    attendeeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/calendars/${calendarId}/events/${eventId}/attendees/${attendeeId}`
    );
  }
};
