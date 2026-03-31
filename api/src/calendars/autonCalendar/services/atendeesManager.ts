/**
 * Attendees Manager Service
 * Centralized exports for all event attendee CRUD operations
 */

export {
  addAttendees,
  AddAttendeeInput,
  Attendee,
  AttendeeStatus,
  AttendeeRole
} from './atendeesManager/addAttendees';
export { getAttendees, getAttendee } from './atendeesManager/getAttendees';
export { updateAttendee, UpdateAttendeeInput } from './atendeesManager/updateAttendee';
export { removeAttendee } from './atendeesManager/removeAttendee';
