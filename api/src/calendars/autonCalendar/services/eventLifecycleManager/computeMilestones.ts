/**
 * Compute Milestones Service
 * Calculates which milestones are still in the future and stores them in Firestore
 *
 * Process:
 * 1. Apply grace period to current time (latency protection)
 * 2. Compute execution times for all possible milestones
 * 3. Filter out past milestones
 * 4. Write future milestones to Firestore in chronological order
 */

import { firestore } from '../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

// Milestone definitions
// Day-based milestones fire at 9:00 AM local time on that day
// Sub-day milestones fire at exact offset from event start
// TODO: Make these configurable per tenant/event-type
const MILESTONE_DEFINITIONS = [
  // Day-based (fire at 9:00 AM local time, N days before event)
  { type: '5_days_before', days: 5, isDayBased: true },
  { type: '4_days_before', days: 4, isDayBased: true },
  { type: '3_days_before', days: 3, isDayBased: true },
  { type: '2_days_before', days: 2, isDayBased: true },
  { type: '1_day_before', days: 1, isDayBased: true },

  // Sub-day (exact offset from event start)
  { type: '6_hours_before', offsetMs: 6 * 60 * 60 * 1000, isDayBased: false },
  { type: '2_hours_before', offsetMs: 2 * 60 * 60 * 1000, isDayBased: false },
  { type: '1_hour_before', offsetMs: 1 * 60 * 60 * 1000, isDayBased: false },
  { type: '30_minutes_before', offsetMs: 30 * 60 * 1000, isDayBased: false },
  { type: '10_minutes_before', offsetMs: 10 * 60 * 1000, isDayBased: false },
  { type: '1_minute_before', offsetMs: 1 * 60 * 1000, isDayBased: false },

  // Post-event
  { type: 'event_completed', isDayBased: false, isCompletion: true }
] as const;

// Minimum delay for day-based milestones (5 minutes)
// Prevents immediate firing when booking at exactly 9:00 AM N days out
const MIN_DAY_DELAY_MS = 5 * 60 * 1000;

// Grace period for sub-day milestones (1 minute)
// Accounts for processing latency during milestone creation
const SUB_DAY_GRACE_MS = 60 * 1000;

export type MilestoneType = typeof MILESTONE_DEFINITIONS[number]['type'];

export interface MilestoneDocument {
  milestoneId: string;
  eventId: string;
  calendarId: string;
  tenantId: string;
  type: MilestoneType;
  executionTime: Date; // When n8n should fire this milestone
  appointmentTime: Date; // Original event startTime (for validation)
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'failed';
  n8nExecutionId: string | null;
  order: number; // Chronological position (0-indexed)
  createdAt: Date;
  updatedAt: Date;
}

export interface ComputeMilestonesInput {
  eventId: string;
  calendarId: string;
  tenantId: string;
  startTime: Date;
  endTime: Date;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  currentTime?: Date; // Defaults to now
}

export interface ComputeMilestonesResult {
  success: boolean;
  milestones: string[]; // Array of milestoneIds in chronological order
  totalComputed: number;
  totalSkipped: number;
  message: string;
}

/**
 * Compute and store future milestones for an event
 *
 * @param input - Event timing data
 * @returns Result with milestone IDs in chronological order
 */
export async function computeMilestones(
  input: ComputeMilestonesInput
): Promise<ComputeMilestonesResult> {
  const { eventId, calendarId, tenantId, startTime, endTime, timezone, currentTime } = input;

  console.log(`\n=� ======== COMPUTING MILESTONES ========`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Start Time: ${startTime.toISOString()}`);
  console.log(`   End Time: ${endTime.toISOString()}`);
  console.log(`   Timezone: ${timezone || 'America/New_York (default)'}`);

  const now = currentTime || new Date();
  const eventTimezone = timezone || 'America/New_York'; // Default to EST

  console.log(`   Current Time: ${now.toISOString()}`);

  // Compute execution times for all milestones
  const computedMilestones = MILESTONE_DEFINITIONS.map(def => {
    let executionTime: Date;
    let isFuture: boolean;

    if (def.isDayBased) {
      // Day-based: Fire at 9:00 AM in the event's timezone, N days before event
      // Convert event startTime to event's timezone
      const eventDateTime = DateTime.fromJSDate(startTime, { zone: eventTimezone });

      // Subtract N days and set to 9:00 AM in that timezone
      const milestoneDateTime = eventDateTime
        .minus({ days: (def as any).days })
        .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });

      // Convert back to UTC Date object
      executionTime = milestoneDateTime.toJSDate();

      // Check if this milestone is in the future (with minimum delay for safety)
      const minTime = new Date(now.getTime() + MIN_DAY_DELAY_MS);
      isFuture = executionTime > minTime;
    } else if (def.type === 'event_completed') {
      // Special case: fire when event ends
      executionTime = new Date(endTime);

      // Apply grace period (latency protection)
      const graceTime = new Date(now.getTime() - SUB_DAY_GRACE_MS);
      isFuture = executionTime > graceTime;
    } else {
      // Sub-day: Fire at exact offset from event start
      executionTime = new Date(startTime.getTime() - (def as any).offsetMs);

      // Apply grace period (latency protection)
      const graceTime = new Date(now.getTime() - SUB_DAY_GRACE_MS);
      isFuture = executionTime > graceTime;
    }

    return {
      type: def.type,
      executionTime,
      isFuture
    };
  });

  // Filter out past milestones
  const futureMilestones = computedMilestones.filter(m => m.isFuture);

  // Sort chronologically (should already be in order, but ensure it)
  futureMilestones.sort((a, b) => a.executionTime.getTime() - b.executionTime.getTime());

  const totalSkipped = computedMilestones.length - futureMilestones.length;

  console.log(`\n   Total Milestones Possible: ${computedMilestones.length}`);
  console.log(`   Future Milestones: ${futureMilestones.length}`);
  console.log(`   Skipped (past): ${totalSkipped}`);

  if (futureMilestones.length === 0) {
    console.log(`\n�  WARNING: No future milestones to schedule. Event may be starting too soon.`);
    return {
      success: true,
      milestones: [],
      totalComputed: 0,
      totalSkipped,
      message: 'No future milestones available (event starting too soon)'
    };
  }

  // Write milestones to Firestore
  const milestonesRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('calendars')
    .doc('autonCalendar')
    .collection('activeCalendars')
    .doc(calendarId)
    .collection('events')
    .doc(eventId)
    .collection('milestones');

  const milestoneIds: string[] = [];
  const batch = firestore.batch();

  console.log(`\n=� Writing milestones to Firestore...`);

  futureMilestones.forEach((milestone, index) => {
    const milestoneId = uuidv4();
    const milestoneDoc: MilestoneDocument = {
      milestoneId,
      eventId,
      calendarId,
      tenantId,
      type: milestone.type,
      executionTime: milestone.executionTime,
      appointmentTime: startTime, // Store for validation
      status: 'pending',
      n8nExecutionId: null,
      order: index, // Chronological position
      createdAt: now,
      updatedAt: now
    };

    const docRef = milestonesRef.doc(milestoneId);
    batch.set(docRef, milestoneDoc);

    milestoneIds.push(milestoneId);

    console.log(`   [${index}] ${milestone.type} @ ${milestone.executionTime.toISOString()}`);
  });

  await batch.commit();

  console.log(`\n ${futureMilestones.length} milestones written to Firestore`);
  console.log(`   ======== MILESTONE COMPUTATION COMPLETE ========\n`);

  return {
    success: true,
    milestones: milestoneIds,
    totalComputed: futureMilestones.length,
    totalSkipped,
    message: `Computed ${futureMilestones.length} future milestones (${totalSkipped} skipped)`
  };
}
