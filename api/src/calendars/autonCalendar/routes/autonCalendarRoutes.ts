import { Router } from 'express';
import {
  createCalendarController,
  getCalendarController,
  getCalendarsController,
  updateCalendarController,
  deleteCalendarController,
  createEventController,
  getEventController,
  getEventsController,
  updateEventController,
  deleteEventController,
  addAttendeesController,
  getAttendeesController,
  getAttendeeController,
  updateAttendeeController,
  removeAttendeeController,
  createTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
  deleteTaskController
} from '../controllers/autonCalendarController';

const router = Router();

// NOTE: All routes here inherit authenticateEither from routes/index.ts
// This means they accept EITHER Firebase JWT OR API Key

// ==================== Calendar Routes ====================

// POST /api/calendars - Create new calendar
router.post('/', createCalendarController);

// GET /api/calendars - Get all calendars for tenant
router.get('/', getCalendarsController);

// GET /api/calendars/:id - Get single calendar
router.get('/:id', getCalendarController);

// PUT /api/calendars/:id - Update calendar
router.put('/:id', updateCalendarController);

// DELETE /api/calendars/:id - Delete calendar
router.delete('/:id', deleteCalendarController);

// ==================== Event Routes ====================
// Nested under calendar routes

// POST /api/calendars/:calendarId/events - Create new event
router.post('/:calendarId/events', createEventController);

// GET /api/calendars/:calendarId/events - Get all events for a calendar
router.get('/:calendarId/events', getEventsController);

// GET /api/calendars/:calendarId/events/:eventId - Get single event
router.get('/:calendarId/events/:eventId', getEventController);

// PUT /api/calendars/:calendarId/events/:eventId - Update event
router.put('/:calendarId/events/:eventId', updateEventController);

// DELETE /api/calendars/:calendarId/events/:eventId - Delete event
router.delete('/:calendarId/events/:eventId', deleteEventController);

// ==================== Attendee Routes ====================
// Nested under event routes

// POST /api/calendars/:calendarId/events/:eventId/attendees - Add attendees to event
router.post('/:calendarId/events/:eventId/attendees', addAttendeesController);

// GET /api/calendars/:calendarId/events/:eventId/attendees - Get all attendees for event
router.get('/:calendarId/events/:eventId/attendees', getAttendeesController);

// GET /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId - Get single attendee
router.get('/:calendarId/events/:eventId/attendees/:attendeeId', getAttendeeController);

// PATCH /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId - Update attendee
router.patch('/:calendarId/events/:eventId/attendees/:attendeeId', updateAttendeeController);

// DELETE /api/calendars/:calendarId/events/:eventId/attendees/:attendeeId - Remove attendee
router.delete('/:calendarId/events/:eventId/attendees/:attendeeId', removeAttendeeController);

// ==================== Task Routes ====================
// Nested under calendar routes

// POST /api/calendars/:calendarId/tasks - Create new task
router.post('/:calendarId/tasks', createTaskController);

// GET /api/calendars/:calendarId/tasks - Get all tasks for a calendar
router.get('/:calendarId/tasks', getTasksController);

// GET /api/calendars/:calendarId/tasks/:taskId - Get single task
router.get('/:calendarId/tasks/:taskId', getTaskController);

// PUT /api/calendars/:calendarId/tasks/:taskId - Update task
router.put('/:calendarId/tasks/:taskId', updateTaskController);

// DELETE /api/calendars/:calendarId/tasks/:taskId - Delete task
router.delete('/:calendarId/tasks/:taskId', deleteTaskController);

// NOTE: Event lifecycle routes have been moved to autonEventLifecycleRoutes.ts
// They are now mounted at /api/event-lifecycle with service key authentication

export default router;
