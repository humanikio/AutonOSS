import { firestore } from '../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarInput {
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

/**
 * Create a new calendar for a tenant
 * @param tenantId - The tenant ID
 * @param input - Calendar creation data
 * @returns The created calendar
 */
export async function createCalendar(
  tenantId: string,
  input: CreateCalendarInput
): Promise<Calendar> {
  try {
    const calendarId = uuidv4();
    const now = new Date();

    const calendar: Calendar = {
      calendarId,
      tenantId,
      name: input.name,
      description: input.description,
      color: input.color || '#3B82F6', // Default blue
      isDefault: input.isDefault || false,
      settings: input.settings,
      createdAt: now,
      updatedAt: now
    };

    // Store in Firebase at: tenants/{tenantId}/calendars/autonCalendar/activeCalendars/{calendarId}
    const calendarRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId);

    await calendarRef.set(calendar);

    console.log(` Calendar created successfully: ${calendarId} for tenant ${tenantId}`);

    return calendar;
  } catch (error) {
    console.error('Error creating calendar:', error);
    throw new Error('Failed to create calendar');
  }
}
