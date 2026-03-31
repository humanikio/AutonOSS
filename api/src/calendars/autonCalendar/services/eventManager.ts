/**
 * Event Manager Service
 * Centralized exports for all calendar event CRUD operations
 */

export {
  createEvent,
  CreateEventInput,
  CalendarEvent,
  EventType
} from './eventManager/createEvent';
export { readEvent } from './eventManager/readEvent';
export { getEvents } from './eventManager/getEvents';
export { updateEvent, UpdateEventInput } from './eventManager/updateEvent';
export { deleteEvent } from './eventManager/deleteEvent';
