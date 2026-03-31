import {
  addAttendees,
  getAttendees,
  getAttendee,
  updateAttendee,
  removeAttendee,
  AddAttendeeInput,
  Attendee
} from '../services/atendeesManager';
import { attendeeContactResolver } from './attendeeContactResolver';

/**
 * Attendee Orchestrator
 * Handles orchestration between events and attendees
 * Manages cascade operations and synchronization
 */

export const attendeeOrchestrator = {

  /**
   * Resolve attendees to contactIds
   * For each attendee without a contactId, find or create a contact
   * @param tenantId - Tenant ID
   * @param attendeesInput - Array of attendee data
   * @returns Array of attendee data with resolved contactIds
   */
  async resolveAttendeeContacts(
    tenantId: string,
    attendeesInput: AddAttendeeInput[]
  ): Promise<AddAttendeeInput[]> {
    const resolvedAttendees: AddAttendeeInput[] = [];

    for (const attendee of attendeesInput) {
      // If contactId is already set, use it as-is
      if (attendee.contactId) {
        resolvedAttendees.push(attendee);
        continue;
      }

      // Otherwise, resolve the contact using email or phone
      try {
        const contactId = await attendeeContactResolver.resolveAttendeeContact({
          tenantId,
          email: attendee.email,
          phone: attendee.phone,
          name: attendee.name
        });

        // Add resolved contactId to attendee data
        resolvedAttendees.push({
          ...attendee,
          contactId
        });
      } catch (error) {
        console.error(`❌ [Orchestrator] Failed to resolve contact for attendee:`, error);
        // Re-throw to fail the operation - we need valid contacts
        throw error;
      }
    }

    return resolvedAttendees;
  },

  /**
   * Create attendees for a new event
   * Called during event creation
   * @param tenantId - Tenant ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   * @param attendeesInput - Array of attendee data
   * @returns Array of created attendee IDs
   */
  async createEventAttendees(
    tenantId: string,
    calendarId: string,
    eventId: string,
    attendeesInput: AddAttendeeInput[]
  ): Promise<string[]> {
    try {
      console.log(`🎭 [Orchestrator] Creating ${attendeesInput.length} attendees for event ${eventId}`);

      if (!attendeesInput || attendeesInput.length === 0) {
        return [];
      }

      // Resolve attendees to contactIds (find or create contacts)
      console.log(`🔍 [Orchestrator] Resolving attendee contacts...`);
      const resolvedAttendees = await this.resolveAttendeeContacts(tenantId, attendeesInput);

      // Call addAttendees service to create all attendees
      const createdAttendees = await addAttendees(
        tenantId,
        calendarId,
        eventId,
        resolvedAttendees
      );

      // Extract and return attendee IDs
      const attendeeIds = createdAttendees.map(a => a.attendeeId);

      console.log(`✅ [Orchestrator] Created ${attendeeIds.length} attendees: ${attendeeIds.join(', ')}`);

      return attendeeIds;
    } catch (error) {
      console.error('❌ [Orchestrator] Error creating event attendees:', error);
      throw error;
    }
  },

  /**
   * Sync attendees on event update
   * Handles create, update, delete of attendees
   * @param tenantId - Tenant ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   * @param newAttendeesData - New attendees data from update request
   * @returns Array of final attendee IDs after sync
   */
  async syncEventAttendees(
    tenantId: string,
    calendarId: string,
    eventId: string,
    newAttendeesData?: AddAttendeeInput[]
  ): Promise<string[]> {
    try {
      console.log(`🎭 [Orchestrator] Syncing attendees for event ${eventId}`);

      // If no attendees provided in update, don't modify existing attendees
      if (!newAttendeesData) {
        const currentAttendees = await getAttendees(tenantId, calendarId, eventId);
        return currentAttendees.map(a => a.attendeeId);
      }

      // Resolve attendees to contactIds (find or create contacts)
      console.log(`🔍 [Orchestrator] Resolving attendee contacts...`);
      const resolvedNewAttendees = await this.resolveAttendeeContacts(tenantId, newAttendeesData);

      // Get current attendees
      const currentAttendees = await getAttendees(tenantId, calendarId, eventId);
      console.log(`📊 [Orchestrator] Current attendees: ${currentAttendees.length}`);

      // Build maps for comparison
      // Use contactId as primary key, fallback to email, then phone
      const getAttendeeKey = (attendee: { contactId?: string; email?: string; phone?: string }): string => {
        return attendee.contactId || attendee.email || attendee.phone || '';
      };

      const currentMap = new Map<string, Attendee>();
      currentAttendees.forEach(a => {
        const key = getAttendeeKey(a);
        if (key) currentMap.set(key, a);
      });

      const newMap = new Map<string, AddAttendeeInput>();
      resolvedNewAttendees.forEach(a => {
        const key = getAttendeeKey(a);
        if (key) newMap.set(key, a);
      });

      // Determine actions
      const toCreate: AddAttendeeInput[] = [];
      const toUpdate: { attendeeId: string; data: AddAttendeeInput }[] = [];
      const toDelete: string[] = [];

      // Check what needs to be created or updated
      for (const [key, newAttendee] of newMap.entries()) {
        if (!currentMap.has(key)) {
          // New attendee - create
          toCreate.push(newAttendee);
        } else {
          // Existing attendee - check if needs update
          const current = currentMap.get(key)!;
          const hasChanges =
            current.name !== newAttendee.name ||
            current.email !== newAttendee.email ||
            current.phone !== newAttendee.phone ||
            current.role !== newAttendee.role ||
            current.status !== newAttendee.status;

          if (hasChanges) {
            toUpdate.push({
              attendeeId: current.attendeeId,
              data: newAttendee
            });
          }
        }
      }

      // Check what needs to be deleted
      for (const [key, current] of currentMap.entries()) {
        if (!newMap.has(key)) {
          toDelete.push(current.attendeeId);
        }
      }

      console.log(`📋 [Orchestrator] Actions: Create ${toCreate.length}, Update ${toUpdate.length}, Delete ${toDelete.length}`);

      // Execute operations in order: Delete, Update, Create

      // 1. Delete removed attendees
      if (toDelete.length > 0) {
        console.log(`🗑️ [Orchestrator] Deleting ${toDelete.length} attendees`);
        const deletePromises = toDelete.map(attendeeId =>
          removeAttendee(tenantId, calendarId, eventId, attendeeId)
        );
        await Promise.all(deletePromises);
      }

      // 2. Update existing attendees
      if (toUpdate.length > 0) {
        console.log(`🔄 [Orchestrator] Updating ${toUpdate.length} attendees`);
        const updatePromises = toUpdate.map(({ attendeeId, data }) =>
          updateAttendee(tenantId, calendarId, eventId, attendeeId, {
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            status: data.status,
            metadata: data.metadata
          })
        );
        await Promise.all(updatePromises);
      }

      // 3. Create new attendees
      if (toCreate.length > 0) {
        console.log(`➕ [Orchestrator] Creating ${toCreate.length} new attendees`);
        await addAttendees(tenantId, calendarId, eventId, toCreate);
      }

      // Get final list of attendees
      const finalAttendees = await getAttendees(tenantId, calendarId, eventId);
      const finalIds = finalAttendees.map(a => a.attendeeId);

      console.log(`✅ [Orchestrator] Sync complete. Final attendee count: ${finalIds.length}`);

      return finalIds;
    } catch (error) {
      console.error('❌ [Orchestrator] Error syncing event attendees:', error);
      throw error;
    }
  },

  /**
   * Delete all attendees for an event (cascade delete)
   * Called before deleting an event
   * @param tenantId - Tenant ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   * @returns Number of attendees deleted
   */
  async deleteAllEventAttendees(
    tenantId: string,
    calendarId: string,
    eventId: string
  ): Promise<number> {
    try {
      console.log(`🎭 [Orchestrator] Deleting all attendees for event ${eventId}`);

      // Get all attendees for this event
      const attendees = await getAttendees(tenantId, calendarId, eventId);

      if (attendees.length === 0) {
        console.log(`ℹ️ [Orchestrator] No attendees to delete for event ${eventId}`);
        return 0;
      }

      console.log(`🗑️ [Orchestrator] Deleting ${attendees.length} attendees`);

      // Delete each attendee in parallel
      const deletePromises = attendees.map(attendee =>
        removeAttendee(tenantId, calendarId, eventId, attendee.attendeeId)
      );

      await Promise.all(deletePromises);

      console.log(`✅ [Orchestrator] Deleted ${attendees.length} attendees for event ${eventId}`);

      return attendees.length;
    } catch (error) {
      console.error('❌ [Orchestrator] Error deleting all event attendees:', error);
      throw error;
    }
  },

  /**
   * Get attendee count for an event
   * Helper function for quick counts
   * @param tenantId - Tenant ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   * @returns Number of attendees
   */
  async getAttendeeCount(
    tenantId: string,
    calendarId: string,
    eventId: string
  ): Promise<number> {
    try {
      const attendees = await getAttendees(tenantId, calendarId, eventId);
      return attendees.length;
    } catch (error) {
      console.error('❌ [Orchestrator] Error getting attendee count:', error);
      return 0;
    }
  },

  /**
   * Validate attendee data before operations
   * @param attendees - Array of attendee input data
   * @returns True if valid, throws error if invalid
   */
  validateAttendees(attendees: AddAttendeeInput[]): boolean {
    for (const attendee of attendees) {
      // Must have at least one identifier
      if (!attendee.contactId && !attendee.email && !attendee.phone) {
        throw new Error(
          'Each attendee must have at least one identifier (contactId, email, or phone). Name alone is not sufficient.'
        );
      }
    }
    return true;
  }
};
