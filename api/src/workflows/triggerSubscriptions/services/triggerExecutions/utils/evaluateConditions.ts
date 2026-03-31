/**
 * Condition Evaluation Utilities
 * Evaluates subscription conditions against incoming event payloads
 *
 * Supports operators:
 * - $eq: Equals
 * - $ne: Not equals
 * - $in: Value in array
 * - $nin: Value not in array
 * - $gt: Greater than (numbers)
 * - $gte: Greater than or equal (numbers)
 * - $lt: Less than (numbers)
 * - $lte: Less than or equal (numbers)
 * - $contains: String contains (case-insensitive)
 * - $exists: Field exists (boolean)
 */

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({ eventData: { eventName: "Meeting" } }, "eventData.eventName") => "Meeting"
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return value;
}

/**
 * Evaluate a single condition against a payload value
 */
function evaluateSingleCondition(operator: any, payloadValue: any): boolean {
  // If operator is not an object, treat as direct equality
  if (typeof operator !== 'object' || operator === null) {
    return payloadValue === operator;
  }

  // Evaluate operator-based conditions
  for (const [op, expectedValue] of Object.entries(operator)) {
    switch (op) {
      case '$eq':
        if (payloadValue !== expectedValue) return false;
        break;

      case '$ne':
        if (payloadValue === expectedValue) return false;
        break;

      case '$in':
        if (!Array.isArray(expectedValue)) return false;
        if (!expectedValue.includes(payloadValue)) return false;
        break;

      case '$nin':
        if (!Array.isArray(expectedValue)) return false;
        if (expectedValue.includes(payloadValue)) return false;
        break;

      case '$gt':
        if (typeof payloadValue !== 'number' || typeof expectedValue !== 'number') return false;
        if (payloadValue <= expectedValue) return false;
        break;

      case '$gte':
        if (typeof payloadValue !== 'number' || typeof expectedValue !== 'number') return false;
        if (payloadValue < expectedValue) return false;
        break;

      case '$lt':
        if (typeof payloadValue !== 'number' || typeof expectedValue !== 'number') return false;
        if (payloadValue >= expectedValue) return false;
        break;

      case '$lte':
        if (typeof payloadValue !== 'number' || typeof expectedValue !== 'number') return false;
        if (payloadValue > expectedValue) return false;
        break;

      case '$contains':
        if (typeof payloadValue !== 'string' || typeof expectedValue !== 'string') return false;
        if (!payloadValue.toLowerCase().includes(expectedValue.toLowerCase())) return false;
        break;

      case '$exists':
        const exists = payloadValue !== undefined && payloadValue !== null;
        if (exists !== expectedValue) return false;
        break;

      default:
        console.warn(`Unknown operator: ${op}`);
        return false;
    }
  }

  return true;
}

/**
 * Evaluate subscription conditions against event payload
 *
 * @param conditions - Conditions from subscription.conditions.payload
 * @param payload - Incoming event payload
 * @returns true if conditions match (or no conditions), false otherwise
 *
 * @example
 * // Subscription wants only "1_hour_before" milestone
 * conditions = { "milestone": { "$eq": "1_hour_before" } }
 * payload = { "milestone": "1_hour_before", ... }
 * Result: true
 *
 * @example
 * // Subscription wants any meeting event
 * conditions = { "eventData.eventType": { "$eq": "meeting" } }
 * payload = { "eventData": { "eventType": "meeting" }, ... }
 * Result: true
 *
 * @example
 * // Subscription wants SMS with media
 * conditions = { "mediaCount": { "$gt": 0 } }
 * payload = { "mediaCount": 2, ... }
 * Result: true
 */
export function evaluateConditions(
  conditions: Record<string, any> | undefined,
  payload: Record<string, any>
): boolean {
  // No conditions means match all
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // Evaluate each condition field
  for (const [field, operator] of Object.entries(conditions)) {
    const payloadValue = getNestedValue(payload, field);

    // Evaluate condition
    if (!evaluateSingleCondition(operator, payloadValue)) {
      // Condition failed
      return false;
    }
  }

  // All conditions passed
  return true;
}

/**
 * Evaluate conditions with detailed logging (for debugging)
 */
export function evaluateConditionsWithLogging(
  subscriptionId: string,
  conditions: Record<string, any> | undefined,
  payload: Record<string, any>
): { match: boolean; reason?: string } {
  if (!conditions || Object.keys(conditions).length === 0) {
    console.log(`    Subscription ${subscriptionId}: No conditions, matches all`);
    return { match: true };
  }

  console.log(`   = Evaluating ${Object.keys(conditions).length} condition(s) for subscription ${subscriptionId}...`);

  for (const [field, operator] of Object.entries(conditions)) {
    const payloadValue = getNestedValue(payload, field);

    console.log(`      Condition: ${field}`);
    console.log(`      Expected: ${JSON.stringify(operator)}`);
    console.log(`      Payload Value: ${JSON.stringify(payloadValue)}`);

    if (!evaluateSingleCondition(operator, payloadValue)) {
      const reason = `Condition failed: ${field} (expected ${JSON.stringify(operator)}, got ${JSON.stringify(payloadValue)})`;
      console.log(`      L ${reason}`);
      return { match: false, reason };
    }

    console.log(`       Condition passed`);
  }

  console.log(`    All conditions passed for subscription ${subscriptionId}`);
  return { match: true };
}
