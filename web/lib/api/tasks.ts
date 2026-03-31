import apiClient from './client';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface Task {
  taskId: string;
  calendarId: string;
  tenantId: string;
  taskName: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  estimatedDuration?: number;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  assignees?: string[];
  primaryAssigneeId?: string | null;
  parentTaskId?: string | null;
  linkedEventId?: string | null;
  tags?: string[];
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  taskName: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  estimatedDuration?: number;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignees?: string[];
  parentTaskId?: string;
  linkedEventId?: string;
  tags?: string[];
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
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

export interface UpdateTaskRequest {
  taskName?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  estimatedDuration?: number;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignees?: string[];
  parentTaskId?: string;
  linkedEventId?: string;
  tags?: string[];
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
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

export const tasksAPI = {
  // Get all tasks for a calendar
  async getTasks(calendarId: string): Promise<Task[]> {
    const response = await apiClient.get(`/api/calendars/${calendarId}/tasks`);
    return response.data.data || [];
  },

  // Get a specific task
  async getTask(calendarId: string, taskId: string): Promise<Task> {
    const response = await apiClient.get(`/api/calendars/${calendarId}/tasks/${taskId}`);
    return response.data.data;
  },

  // Create a new task
  async createTask(calendarId: string, data: CreateTaskRequest): Promise<Task> {
    const response = await apiClient.post(`/api/calendars/${calendarId}/tasks`, data);
    return response.data.data;
  },

  // Update an existing task
  async updateTask(
    calendarId: string,
    taskId: string,
    data: UpdateTaskRequest
  ): Promise<Task> {
    const response = await apiClient.put(`/api/calendars/${calendarId}/tasks/${taskId}`, data);
    return response.data.data;
  },

  // Delete a task
  async deleteTask(calendarId: string, taskId: string): Promise<void> {
    await apiClient.delete(`/api/calendars/${calendarId}/tasks/${taskId}`);
  }
};
