/**
 * Transformation Method Registry
 *
 * Central registry for all transformation methods.
 * Provides lookup and registration capabilities.
 */

import type { Transformation } from './types/transformationMethodTypes';
import {
  waitAppointmentMilestone,
  wait_timeInterval,
  wait_specificTime,
  wait_webhook,
  wait_form
} from './eventWaitMethod';
import { triggerWebhook } from './triggers/trigger_webhook';
import { adapterContact } from './adapters/adapter_contact';
import { nativeWebhook } from './native/native_webhook';
import { sms_send, sms_inboundAgent, sms_outboundAgent } from './sms';
import { email_send } from './email';
import {
  contact_find,
  contact_create,
  contact_update,
  contact_delete,
  contact_addTag,
  contact_removeTag
} from './contactManagement';
import { action_aiProcessing, action_triggerWorkflow } from './action';
import { opportunity_create, opportunity_update, opportunity_delete } from './opportunities';
import { phone_outboundCall } from './phone';
import { condition_if, condition_switch } from './condition';

/**
 * Singleton registry for transformation methods
 */
export class TransformationRegistry {
  private static instance: TransformationRegistry;
  private transformations: Map<string, Transformation> = new Map();

  private constructor() {
    // Register all transformation methods

    // Triggers
    this.register(triggerWebhook); // Custom subscription triggers

    // Native n8n Nodes
    this.register(nativeWebhook); // Native n8n webhook trigger

    // Adapters
    this.register(adapterContact);

    // Event Wait Methods
    this.register(waitAppointmentMilestone);
    this.register(wait_timeInterval);
    this.register(wait_specificTime);
    this.register(wait_webhook);
    this.register(wait_form);

    // SMS Methods
    this.register(sms_send);
    this.register(sms_inboundAgent);
    this.register(sms_outboundAgent);

    // Email Methods
    this.register(email_send);

    // Contact Management Methods
    this.register(contact_find);
    this.register(contact_create);
    this.register(contact_update);
    this.register(contact_delete);
    this.register(contact_addTag);
    this.register(contact_removeTag);

    // Action Methods
    this.register(action_aiProcessing);
    this.register(action_triggerWorkflow);

    // Opportunity Methods
    this.register(opportunity_create);
    this.register(opportunity_update);
    this.register(opportunity_delete);

    // Phone Methods
    this.register(phone_outboundCall);

    // Condition Methods
    this.register(condition_if);
    this.register(condition_switch);

    // Future transformations will be registered here:
    // this.register(otherTransformation);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TransformationRegistry {
    if (!TransformationRegistry.instance) {
      TransformationRegistry.instance = new TransformationRegistry();
    }
    return TransformationRegistry.instance;
  }

  /**
   * Register a transformation method
   */
  private register(transformation: Transformation): void {
    if (this.transformations.has(transformation.name)) {
      console.warn(
        `�  Transformation "${transformation.name}" is already registered. Overwriting.`
      );
    }
    this.transformations.set(transformation.name, transformation);
    console.log(` Registered transformation: ${transformation.name}`);
  }

  /**
   * Get a transformation by name
   */
  public get(name: string): Transformation | undefined {
    return this.transformations.get(name);
  }

  /**
   * Get all registered transformations
   */
  public getAll(): Map<string, Transformation> {
    return new Map(this.transformations);
  }

  /**
   * Check if a transformation exists
   */
  public has(name: string): boolean {
    return this.transformations.has(name);
  }

  /**
   * Get all transformation names
   */
  public getNames(): string[] {
    return Array.from(this.transformations.keys());
  }
}
