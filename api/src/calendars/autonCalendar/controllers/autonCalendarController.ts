import { Request, Response } from 'express';
import {
  createCalendar,
  readCalendar,
  getCalendars,
  updateCalendar,
  deleteCalendar,
  CreateCalendarInput,
  UpdateCalendarInput
} from '../services/calendarManager';
import {
  createEvent,
  readEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  CreateEventInput,
  UpdateEventInput
} from '../services/eventManager';
import {
  addAttendees,
  getAttendees,
  getAttendee,
  updateAttendee,
  removeAttendee,
  AddAttendeeInput,
  UpdateAttendeeInput
} from '../services/atendeesManager';
import {
  reviewMilestone,
  ReviewMilestoneInput
} from '../services/eventLifecycleManager';
import {
  createTask,
  readTask,
  getTasks,
  updateTask,
  deleteTask,
  CreateTaskInput,
  UpdateTaskInput
} from '../services/taskManager';

// ==================== Calendar Controllers ====================

/**
 * Create a new calendar
 * POST /api/calendars
 */
export const createCalendarController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    const input: CreateCalendarInput = req.body;

    // Validate required fields
    if (!input.name || input.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Calendar name is required'
      });
      return;
    }

    const calendar = await createCalendar(tenantId, input);

    res.status(201).json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error creating calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar'
    });
  }
};

/**
 * Get a single calendar by ID
 * GET /api/calendars/:id
 */
export const getCalendarController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const calendar = await readCalendar(tenantId, id);

    if (!calendar) {
      res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error getting calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar'
    });
  }
};

/**
 * Get all calendars for a tenant
 * GET /api/calendars
 */
export const getCalendarsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    const calendars = await getCalendars(tenantId);

    res.status(200).json({
      success: true,
      data: calendars
    });
  } catch (error) {
    console.error('Error getting calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendars'
    });
  }
};

/**
 * Update a calendar
 * PUT /api/calendars/:id
 */
export const updateCalendarController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const input: UpdateCalendarInput = req.body;

    const calendar = await updateCalendar(tenantId, id, input);

    if (!calendar) {
      res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar'
    });
  }
};

/**
 * Delete a calendar
 * DELETE /api/calendars/:id
 */
export const deleteCalendarController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const deleted = await deleteCalendar(tenantId, id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Calendar not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Calendar deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar'
    });
  }
};

// ==================== Event Controllers ====================

/**
 * Create a new event for a calendar
 * POST /api/calendars/:calendarId/events
 */
export const createEventController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const input: CreateEventInput = req.body;

    // Validate required fields
    if (!input.eventName || input.eventName.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Event name is required'
      });
      return;
    }

    if (!input.eventType) {
      res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
      return;
    }

    if (!input.startTime) {
      res.status(400).json({
        success: false,
        error: 'Start time is required'
      });
      return;
    }

    if (!input.endTime) {
      res.status(400).json({
        success: false,
        error: 'End time is required'
      });
      return;
    }

    // Convert string dates to Date objects
    const eventInput: CreateEventInput = {
      ...input,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime)
    };

    const event = await createEvent(tenantId, calendarId, eventInput);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
};

/**
 * Get a single event by ID
 * GET /api/calendars/:calendarId/events/:eventId
 */
export const getEventController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required'
      });
      return;
    }

    const event = await readEvent(tenantId, calendarId, eventId);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event'
    });
  }
};

/**
 * Get all events for a calendar
 * GET /api/calendars/:calendarId/events
 */
export const getEventsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const events = await getEvents(tenantId, calendarId);

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get events'
    });
  }
};

/**
 * Update an event
 * PUT /api/calendars/:calendarId/events/:eventId
 */
export const updateEventController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required'
      });
      return;
    }

    const input: UpdateEventInput = req.body;

    // Convert string dates to Date objects if provided
    if (input.startTime) {
      input.startTime = new Date(input.startTime);
    }
    if (input.endTime) {
      input.endTime = new Date(input.endTime);
    }

    const event = await updateEvent(tenantId, calendarId, eventId, input);

    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
};

/**
 * Delete an event
 * DELETE /api/calendars/:calendarId/events/:eventId
 */
export const deleteEventController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required'
      });
      return;
    }

    const deleted = await deleteEvent(tenantId, calendarId, eventId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Event not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
};

// ==================== Attendee Controllers ====================

/**
 * Add attendees to an event
 * POST /api/calendars/:calendarId/events/:eventId/attendees
 */
export const addAttendeesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required'
      });
      return;
    }

    const attendeesInput: AddAttendeeInput[] = Array.isArray(req.body) ? req.body : [req.body];

    // Validate that at least one attendee is provided
    if (attendeesInput.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one attendee must be provided'
      });
      return;
    }

    // Validate each attendee has at least one valid identifier
    for (const input of attendeesInput) {
      if (!input.contactId && !input.email && !input.phone) {
        res.status(400).json({
          success: false,
          error: 'Each attendee must have at least one identifier (contactId, email, or phone). Name alone is not sufficient.'
        });
        return;
      }
    }

    const attendees = await addAttendees(tenantId, calendarId, eventId, attendeesInput);

    res.status(201).json({
      success: true,
      data: attendees
    });
  } catch (error) {
    console.error('Error adding attendees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add attendees'
    });
  }
};

/**
 * Get all attendees for an event
 * GET /api/calendars/:calendarId/events/:eventId/attendees
 */
export const getAttendeesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Event ID are required'
      });
      return;
    }

    const attendees = await getAttendees(tenantId, calendarId, eventId);

    res.status(200).json({
      success: true,
      data: attendees
    });
  } catch (error) {
    console.error('Error getting attendees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendees'
    });
  }
};

/**
 * Get a single attendee
 * GET /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId
 */
export const getAttendeeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId, attendeeId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId || !attendeeId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID, Event ID, and Attendee ID are required'
      });
      return;
    }

    const attendee = await getAttendee(tenantId, calendarId, eventId, attendeeId);

    if (!attendee) {
      res.status(404).json({
        success: false,
        error: 'Attendee not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: attendee
    });
  } catch (error) {
    console.error('Error getting attendee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendee'
    });
  }
};

/**
 * Update an attendee
 * PATCH /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId
 */
export const updateAttendeeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId, attendeeId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId || !attendeeId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID, Event ID, and Attendee ID are required'
      });
      return;
    }

    const input: UpdateAttendeeInput = req.body;

    const attendee = await updateAttendee(tenantId, calendarId, eventId, attendeeId, input);

    if (!attendee) {
      res.status(404).json({
        success: false,
        error: 'Attendee not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: attendee
    });
  } catch (error) {
    console.error('Error updating attendee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update attendee'
    });
  }
};

/**
 * Remove an attendee
 * DELETE /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId
 */
export const removeAttendeeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, eventId, attendeeId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !eventId || !attendeeId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID, Event ID, and Attendee ID are required'
      });
      return;
    }

    const removed = await removeAttendee(tenantId, calendarId, eventId, attendeeId);

    if (!removed) {
      res.status(404).json({
        success: false,
        error: 'Attendee not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Attendee removed successfully'
    });
  } catch (error) {
    console.error('Error removing attendee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove attendee'
    });
  }
};

// ==================== Event Lifecycle Controllers ====================

/**
 * Process event lifecycle milestone
 * POST /api/calendars/event-lifecycle/milestone
 *
 * Called by n8n state holder workflows at various milestones
 * throughout an event's lifecycle (reminders, completion, etc.)
 */
export const processMilestoneController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    // Extract milestone data from request body
    const {
      eventId,
      calendarId,
      milestone,
      stateHolderTimestamp,
      attendeeIds,
      metadata,
      workflowExecutionId
    } = req.body;

    // Validate required fields
    if (!eventId) {
      res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    if (!milestone) {
      res.status(400).json({
        success: false,
        error: 'Milestone is required'
      });
      return;
    }

    if (!stateHolderTimestamp) {
      res.status(400).json({
        success: false,
        error: 'State holder timestamp is required'
      });
      return;
    }

    // Convert timestamp string to Date
    const timestampDate = new Date(stateHolderTimestamp);
    if (isNaN(timestampDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid timestamp format'
      });
      return;
    }

    // Extract milestoneId from request body (required for Pattern B)
    const { milestoneId } = req.body;

    if (!milestoneId) {
      res.status(400).json({
        success: false,
        error: 'Milestone ID is required'
      });
      return;
    }

    // Prepare input for milestone review (Pattern B)
    const input: ReviewMilestoneInput = {
      milestoneId,
      tenantId,
      eventId,
      calendarId,
      milestone,
      stateHolderTimestamp: timestampDate,
      attendeeIds: attendeeIds || []
    };

    // Process milestone through new Pattern B flow
    const result = await reviewMilestone(input);

    // Return appropriate status code based on result
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          validation: result.validationResult,
          recomputeTriggered: result.recomputeTriggered,
          nextMilestoneScheduled: result.nextMilestoneScheduled,
          notification: result.notificationResult ? {
            subscriptionsTriggered: result.notificationResult.subscriptionsFound,
            completed: result.notificationResult.summary.completed,
            failed: result.notificationResult.summary.failed
          } : undefined,
          completion: result.completionResult
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: {
          validation: result.validationResult,
          recomputeTriggered: result.recomputeTriggered
        }
      });
    }

  } catch (error) {
    console.error('Error processing milestone event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process milestone event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ==================== Task Controllers ====================

/**
 * Create a new task for a calendar
 * POST /api/calendars/:calendarId/tasks
 */
export const createTaskController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const input: CreateTaskInput = req.body;

    // Validate required fields
    if (!input.taskName || input.taskName.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Task name is required'
      });
      return;
    }

    // Convert string dates to Date objects if provided
    const taskInput: CreateTaskInput = {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      dueTime: input.dueTime ? new Date(input.dueTime) : undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined
    };

    const task = await createTask(tenantId, calendarId, taskInput);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/calendars/:calendarId/tasks/:taskId
 */
export const getTaskController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, taskId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !taskId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Task ID are required'
      });
      return;
    }

    const task = await readTask(tenantId, calendarId, taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get task'
    });
  }
};

/**
 * Get all tasks for a calendar
 * GET /api/calendars/:calendarId/tasks
 */
export const getTasksController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    const tasks = await getTasks(tenantId, calendarId);

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tasks'
    });
  }
};

/**
 * Update a task
 * PUT /api/calendars/:calendarId/tasks/:taskId
 */
export const updateTaskController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, taskId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !taskId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Task ID are required'
      });
      return;
    }

    const input: UpdateTaskInput = req.body;

    // Convert string dates to Date objects if provided
    if (input.dueDate) {
      input.dueDate = new Date(input.dueDate);
    }
    if (input.dueTime) {
      input.dueTime = new Date(input.dueTime);
    }
    if (input.startDate) {
      input.startDate = new Date(input.startDate);
    }

    const task = await updateTask(tenantId, calendarId, taskId, input);

    if (!task) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
};

/**
 * Delete a task
 * DELETE /api/calendars/:calendarId/tasks/:taskId
 */
export const deleteTaskController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { calendarId, taskId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant authentication required'
      });
      return;
    }

    if (!calendarId || !taskId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID and Task ID are required'
      });
      return;
    }

    const deleted = await deleteTask(tenantId, calendarId, taskId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
};
