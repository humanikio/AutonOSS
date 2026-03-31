import { eventsAPI, CalendarEvent, CreateEventRequest, UpdateEventRequest } from '@/lib/api/events';
import { tasksAPI, Task, UpdateTaskRequest } from '@/lib/api/tasks';

/**
 * Calendar Service
 * Handles all API interactions for calendar events and tasks
 */
export class CalendarService {
  private calendarId: string;

  constructor(calendarId: string) {
    this.calendarId = calendarId;
  }

  /**
   * Fetch all events for this calendar
   */
  async fetchEvents(): Promise<CalendarEvent[]> {
    try {
      const events = await eventsAPI.getEvents(this.calendarId);
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  /**
   * Fetch all tasks for this calendar
   */
  async fetchTasks(): Promise<Task[]> {
    try {
      const tasks = await tasksAPI.getTasks(this.calendarId);
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: any): Promise<void> {
    try {
      await tasksAPI.createTask(this.calendarId, taskData);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventRequest): Promise<void> {
    try {
      await eventsAPI.createEvent(this.calendarId, eventData);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: UpdateEventRequest): Promise<void> {
    try {
      await eventsAPI.updateEvent(this.calendarId, eventId, updates);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await eventsAPI.deleteEvent(this.calendarId, eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<void> {
    try {
      await tasksAPI.updateTask(this.calendarId, taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await tasksAPI.deleteTask(this.calendarId, taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
}
