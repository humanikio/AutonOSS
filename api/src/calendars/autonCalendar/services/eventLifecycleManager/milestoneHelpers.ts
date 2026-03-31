/**
 * Milestone Helper Functions
 * Utilities for querying and managing milestones in Firestore
 */

import { firestore } from '../../../../config/firebase';
import { MilestoneDocument } from './computeMilestones';

/**
 * Get the next pending milestone for an event (chronologically)
 *
 * @param eventId - Event identifier
 * @param calendarId - Calendar identifier
 * @param tenantId - Tenant identifier
 * @returns Next milestone or null if none pending
 */
export async function getNextPendingMilestone(
  eventId: string,
  calendarId: string,
  tenantId: string
): Promise<MilestoneDocument | null> {
  try {
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

    const querySnapshot = await milestonesRef
      .where('status', '==', 'pending')
      .orderBy('order', 'asc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.log(`📭 No pending milestones found for event ${eventId}`);
      return null;
    }

    const doc = querySnapshot.docs[0];
    const milestone = doc.data() as MilestoneDocument;

    console.log(`📬 Next pending milestone: ${milestone.type} (order: ${milestone.order})`);

    return milestone;

  } catch (error) {
    console.error(`❌ Error fetching next pending milestone:`, error);
    throw error;
  }
}

/**
 * Cancel all pending and scheduled milestones for an event
 * Used when event is rescheduled or deleted
 *
 * @param eventId - Event identifier
 * @param calendarId - Calendar identifier
 * @param tenantId - Tenant identifier
 * @returns Number of milestones cancelled
 */
export async function cancelAllPendingMilestones(
  eventId: string,
  calendarId: string,
  tenantId: string
): Promise<number> {
  try {
    console.log(`\n🚫 Cancelling all pending/scheduled milestones for event ${eventId}...`);

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

    // Get all pending or scheduled milestones
    const querySnapshot = await milestonesRef
      .where('status', 'in', ['pending', 'scheduled'])
      .get();

    if (querySnapshot.empty) {
      console.log(`   No milestones to cancel`);
      return 0;
    }

    const batch = firestore.batch();
    const now = new Date();

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now
      });
    });

    await batch.commit();

    console.log(`✅ Cancelled ${querySnapshot.docs.length} milestone(s)`);

    return querySnapshot.docs.length;

  } catch (error) {
    console.error(`❌ Error cancelling milestones:`, error);
    throw error;
  }
}

/**
 * Get a milestone by ID
 *
 * @param milestoneId - Milestone identifier
 * @param eventId - Event identifier
 * @param calendarId - Calendar identifier
 * @param tenantId - Tenant identifier
 * @returns Milestone or null if not found
 */
export async function getMilestone(
  milestoneId: string,
  eventId: string,
  calendarId: string,
  tenantId: string
): Promise<MilestoneDocument | null> {
  try {
    const milestoneRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId)
      .collection('milestones')
      .doc(milestoneId);

    const doc = await milestoneRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as MilestoneDocument;

  } catch (error) {
    console.error(`❌ Error fetching milestone:`, error);
    throw error;
  }
}

/**
 * Get all milestones for an event
 *
 * @param eventId - Event identifier
 * @param calendarId - Calendar identifier
 * @param tenantId - Tenant identifier
 * @param status - Optional status filter
 * @returns Array of milestones
 */
export async function getAllMilestones(
  eventId: string,
  calendarId: string,
  tenantId: string,
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'failed'
): Promise<MilestoneDocument[]> {
  try {
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

    let query: FirebaseFirestore.Query = milestonesRef.orderBy('order', 'asc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const querySnapshot = await query.get();

    return querySnapshot.docs.map(doc => doc.data() as MilestoneDocument);

  } catch (error) {
    console.error(`❌ Error fetching milestones:`, error);
    throw error;
  }
}
