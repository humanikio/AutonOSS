/**
 * Build Subscription Conditions from Trigger Node Parameters
 *
 * Converts trigger node filter parameters (milestoneFilter, eventTypeFilter, etc.)
 * into subscription condition format for payload filtering
 */

/**
 * Build conditions.payload from Event Lifecycle Milestone trigger parameters
 *
 * @param milestoneFilter - Value from node's milestoneFilter parameter
 * @param eventTypeFilter - Value from node's eventTypeFilter parameter
 * @returns conditions.payload object for subscription
 */
export function buildEventLifecycleMilestoneConditions(
  milestoneFilter?: string,
  eventTypeFilter?: string
): Record<string, any> | undefined {
  const conditions: Record<string, any> = {};

  // Add milestone filter if specified and not "all"
  if (milestoneFilter && milestoneFilter !== 'all') {
    conditions['milestone'] = { $eq: milestoneFilter };
  }

  // Add event type filter if specified and not "all"
  if (eventTypeFilter && eventTypeFilter !== 'all') {
    conditions['eventData.eventType'] = { $eq: eventTypeFilter };
  }

  // Return undefined if no conditions (matches all)
  return Object.keys(conditions).length > 0 ? conditions : undefined;
}

/**
 * Build conditions.payload from SMS Received trigger parameters
 *
 * @param hasMedia - Whether to filter for messages with media
 * @param fromNumber - Filter by specific phone number
 * @returns conditions.payload object for subscription
 */
export function buildSmsReceivedConditions(
  hasMedia?: boolean,
  fromNumber?: string
): Record<string, any> | undefined {
  const conditions: Record<string, any> = {};

  // Filter by media presence
  if (hasMedia !== undefined) {
    if (hasMedia) {
      conditions['mediaCount'] = { $gt: 0 };
    } else {
      conditions['mediaCount'] = { $eq: 0 };
    }
  }

  // Filter by phone number
  if (fromNumber && fromNumber.trim() !== '') {
    conditions['from'] = { $eq: fromNumber };
  }

  return Object.keys(conditions).length > 0 ? conditions : undefined;
}

/**
 * Build conditions.payload from Phone Call Completed trigger parameters
 *
 * @param callStatus - Filter by call status (completed, no-answer, busy, failed)
 * @param minDuration - Minimum call duration in seconds
 * @returns conditions.payload object for subscription
 */
export function buildPhoneCallCompletedConditions(
  callStatus?: string,
  minDuration?: number
): Record<string, any> | undefined {
  const conditions: Record<string, any> = {};

  // Filter by call status
  if (callStatus && callStatus !== 'all') {
    conditions['callStatus'] = { $eq: callStatus };
  }

  // Filter by minimum duration
  if (minDuration !== undefined && minDuration > 0) {
    conditions['duration'] = { $gte: minDuration };
  }

  return Object.keys(conditions).length > 0 ? conditions : undefined;
}

/**
 * Build subscription conditions from trigger node configuration
 *
 * @param triggerType - Trigger type (e.g., "event.lifecycle.milestone.v1")
 * @param nodeParameters - Parameters from the trigger node
 * @returns conditions object for subscription creation
 */
export function buildSubscriptionConditions(
  triggerType: string,
  nodeParameters?: Record<string, any>
): { payload?: Record<string, any> } | undefined {
  if (!nodeParameters) {
    return undefined;
  }

  let payloadConditions: Record<string, any> | undefined;

  // Route to appropriate builder based on trigger type
  switch (triggerType) {
    case 'event.lifecycle.milestone.v1':
      payloadConditions = buildEventLifecycleMilestoneConditions(
        nodeParameters.milestoneFilter,
        nodeParameters.eventTypeFilter
      );
      break;

    case 'sms.received.v1':
      payloadConditions = buildSmsReceivedConditions(
        nodeParameters.hasMedia,
        nodeParameters.fromNumber
      );
      break;

    case 'phone.call.completed.v1':
      payloadConditions = buildPhoneCallCompletedConditions(
        nodeParameters.callStatus,
        nodeParameters.minDuration
      );
      break;

    default:
      // Unknown trigger type - no automatic condition building
      payloadConditions = undefined;
  }

  // Return conditions object if we have payload conditions
  if (payloadConditions && Object.keys(payloadConditions).length > 0) {
    return { payload: payloadConditions };
  }

  return undefined;
}
