import { firestore } from '../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative';
export type AttendeeRole = 'organizer' | 'attendee' | 'optional';

export interface Attendee {
  attendeeId: string;
  calendarId: string;
  eventId: string;
  tenantId: string;
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role: AttendeeRole;
  status: AttendeeStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddAttendeeInput {
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: AttendeeRole;
  status?: AttendeeStatus;
  metadata?: Record<string, any>;
}

/**
 * Add attendees to an event
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @param attendeesInput - Array of attendee data
 * @returns Array of created attendees
 */
export async function addAttendees(
  tenantId: string,
  calendarId: string,
  eventId: string,
  attendeesInput: AddAttendeeInput[]
): Promise<Attendee[]> {
  try {
    const now = new Date();
    const createdAttendees: Attendee[] = [];

    // Validate that at least one valid identifier is provided for each attendee
    for (const input of attendeesInput) {
      if (!input.contactId && !input.email && !input.phone) {
        throw new Error('At least one identifier (contactId, email, or phone) must be provided for each attendee');
      }
    }

    // Create batch to add all attendees
    const batch = firestore.batch();

    for (const input of attendeesInput) {
      const attendeeId = uuidv4();

      const attendee: Attendee = {
        attendeeId,
        calendarId,
        eventId,
        tenantId,
        contactId: input.contactId,
        email: input.email,
        phone: input.phone,
        name: input.name,
        role: input.role || 'attendee',
        status: input.status || 'pending',
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now
      };

      const attendeeRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('calendars')
        .doc('autonCalendar')
        .collection('activeCalendars')
        .doc(calendarId)
        .collection('events')
        .doc(eventId)
        .collection('attendees')
        .doc(attendeeId);

      batch.set(attendeeRef, attendee);
      createdAttendees.push(attendee);
    }

    await batch.commit();

    console.log(`✅ Added ${createdAttendees.length} attendees to event ${eventId}`);

    return createdAttendees;
  } catch (error) {
    console.error('Error adding attendees:', error);
    throw new Error('Failed to add attendees');
  }
}
