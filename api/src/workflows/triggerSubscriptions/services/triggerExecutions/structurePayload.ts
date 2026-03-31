/**
 * Structure and Validate Payload
 * Validates payload against trigger schema (required fields only)
 */

import { TriggerDestinationRegistry } from '../TriggerDesitinationRegistry/index';

export interface ValidatePayloadInput {
  triggerType: string;
  payload: Record<string, any>;
}

export interface ValidatePayloadResult {
  valid: boolean;
  errors: string[];
  payload: Record<string, any>;
}

/**
 * Validate payload against trigger schema
 * Only checks required fields, not all fields
 */
export function structurePayload(
  input: ValidatePayloadInput
): ValidatePayloadResult {
  const { triggerType, payload } = input;

  console.log(`= Validating payload for triggerType: ${triggerType}`);

  // Get event definition from registry
  const eventDefinition = TriggerDestinationRegistry.getEventDefinition(triggerType);

  if (!eventDefinition) {
    return {
      valid: false,
      errors: [`Unknown trigger type: ${triggerType}`],
      payload
    };
  }

  // Validate payload using registry
  const validation = TriggerDestinationRegistry.validatePayload(triggerType, payload);

  if (!validation.valid) {
    console.error(`L Payload validation failed:`, validation.errors);
    return {
      valid: false,
      errors: validation.errors,
      payload
    };
  }

  console.log(` Payload validation passed`);

  return {
    valid: true,
    errors: [],
    payload
  };
}
