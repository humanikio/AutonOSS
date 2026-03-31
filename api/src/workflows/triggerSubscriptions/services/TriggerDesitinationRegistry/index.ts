/**
 * Trigger Destination Registry
 * Central registry for all available trigger event types
 * Provides validation, schema lookup, and event type management
 */

import { TriggerEventDefinition } from '../../types';

// Import event definitions
import { smsReceivedV1 } from './records/sms.received.v1';
import { phoneCallCompletedV1 } from './records/phone.call.completed.v1';
import { eventLifecycleMilestoneV1 } from './records/event.lifecycle.milestone.v1';
import { eventLifecycleMilestoneWaitV1 } from './records/event.lifecycle.milestone.wait.v1';

/**
 * Event registry mapping event type to definition
 * Currently supports:
 * - SMS received events (after tenant/contact resolution)
 * - Phone call completed events (after transcript processing)
 * - Event lifecycle milestones (calendar event reminders and completion)
 * - Event lifecycle milestone waits (wait nodes for calendar events)
 */
const eventRegistry: Record<string, TriggerEventDefinition> = {
  'sms.received.v1': smsReceivedV1,
  'phone.call.completed.v1': phoneCallCompletedV1,
  'event.lifecycle.milestone.v1': eventLifecycleMilestoneV1,
  'event.lifecycle.milestone.wait.v1': eventLifecycleMilestoneWaitV1,
};

/**
 * Trigger Destination Registry Service
 */
export class TriggerDestinationRegistry {
  /**
   * Get event definition by type
   */
  static getEventDefinition(eventType: string): TriggerEventDefinition | null {
    return eventRegistry[eventType] || null;
  }

  /**
   * List all available event types
   */
  static getAllEventTypes(): string[] {
    return Object.keys(eventRegistry);
  }

  /**
   * Get all event definitions
   */
  static getAllEventDefinitions(): TriggerEventDefinition[] {
    return Object.values(eventRegistry);
  }

  /**
   * Get events by category
   */
  static getEventsByCategory(category: string): TriggerEventDefinition[] {
    return Object.values(eventRegistry).filter(e => e.category === category);
  }

  /**
   * Validate event type exists and is not deprecated
   */
  static validateEventType(eventType: string): { valid: boolean; error?: string } {
    const def = this.getEventDefinition(eventType);

    if (!def) {
      return { valid: false, error: `Unknown event type: ${eventType}` };
    }

    if (def.deprecatedAt) {
      return {
        valid: false,
        error: `Event type ${eventType} is deprecated${def.replacedBy ? `. Use ${def.replacedBy} instead` : ''}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate payload against schema (basic validation)
   * For Phase 1, just checks required fields
   * Can be enhanced with full JSON Schema validation (AJV) in Phase 2
   */
  static validatePayload(eventType: string, payload: any): { valid: boolean; errors: string[] } {
    const def = this.getEventDefinition(eventType);
    if (!def) {
      return { valid: false, errors: ['Unknown event type'] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const required of def.payloadSchema.required) {
      if (!(required in payload)) {
        errors.push(`Missing required field: ${required}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if event type exists
   */
  static hasEventType(eventType: string): boolean {
    return eventType in eventRegistry;
  }

  /**
   * Get filterable fields for an event type
   */
  static getFilterableFields(eventType: string): Array<{ field: string; type: string; description: string }> {
    const def = this.getEventDefinition(eventType);
    return def?.filterableFields || [];
  }

  /**
   * Get example payload for an event type
   */
  static getExamplePayload(eventType: string): Record<string, any> | null {
    const def = this.getEventDefinition(eventType);
    return def?.examplePayload || null;
  }
}
