import apiClient from './client';

export interface Calendar {
  calendarId: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: {
    timezone?: string;
    workingHours?: {
      start: string;
      end: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarRequest {
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: {
    timezone?: string;
    workingHours?: {
      start: string;
      end: string;
    };
  };
}

export interface UpdateCalendarRequest {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: {
    timezone?: string;
    workingHours?: {
      start: string;
      end: string;
    };
  };
}

export const calendarsAPI = {
  // Get all calendars
  async getCalendars(): Promise<Calendar[]> {
    const response = await apiClient.get('/api/calendars');
    return response.data.data || [];
  },

  // Get a specific calendar
  async getCalendar(id: string): Promise<Calendar> {
    const response = await apiClient.get(`/api/calendars/${id}`);
    return response.data.data;
  },

  // Create a new calendar
  async createCalendar(data: CreateCalendarRequest): Promise<Calendar> {
    const response = await apiClient.post('/api/calendars', data);
    return response.data.data;
  },

  // Update an existing calendar
  async updateCalendar(id: string, data: UpdateCalendarRequest): Promise<Calendar> {
    const response = await apiClient.put(`/api/calendars/${id}`, data);
    return response.data.data;
  },

  // Delete a calendar
  async deleteCalendar(id: string): Promise<void> {
    await apiClient.delete(`/api/calendars/${id}`);
  }
};
