/**
 * Milestone Wait Determination Function
 *
 * Runtime logic to determine which milestone wait case to route to.
 * Used by switch node to select the correct subflow group.
 *
 * Logic:
 * 1. Get appointment time from event data
 * 2. Get current time
 * 3. Calculate time until appointment
 * 4. Find the first milestone that hasn't passed yet
 * 5. Return that milestone's case value, or 'none' if all are past
 */

/**
 * Milestone offset configurations (in milliseconds)
 */
const MILESTONE_OFFSETS: Record<string, number> = {
  '5_days_before': 5 * 24 * 60 * 60 * 1000,
  '4_days_before': 4 * 24 * 60 * 60 * 1000,
  '3_days_before': 3 * 24 * 60 * 60 * 1000,
  '2_days_before': 2 * 24 * 60 * 60 * 1000,
  '1_day_before': 1 * 24 * 60 * 60 * 1000,
  '1_hour_before': 1 * 60 * 60 * 1000,
  '30_minutes_before': 30 * 60 * 1000,
  '10_minutes_before': 10 * 60 * 1000,
  'event_start': 0,
  'event_completed': 0, // Special case - handled differently
};

/**
 * Compute next valid milestone for appointment-based waits
 *
 * This function is compiled into n8n expressions and runs at workflow execution time.
 * It determines which milestone wait case should be executed based on:
 * - Current time
 * - Event start time
 * - Available milestone options
 *
 * @param startTime - ISO timestamp of the event start
 * @param milestones - Array of milestone values available in this workflow
 * @returns The group index (0, 1, 2, etc.) to route to
 */
export function computeNextValidMilestone(
  startTime: string,
  milestones: string[]
): number {
  const now = Date.now();
  const startTimeMs = new Date(startTime).getTime();

  // Calculate time remaining until event
  const timeUntilEvent = startTimeMs - now;

  // Filter out event_completed (special case)
  const beforeMilestones = milestones.filter(m => m !== 'event_completed');

  // Sort milestones by offset (largest first)
  const sortedMilestones = beforeMilestones
    .map((milestone, index) => ({
      value: milestone,
      offset: MILESTONE_OFFSETS[milestone] || 0,
      index, // Group index for this milestone
    }))
    .sort((a, b) => b.offset - a.offset);

  // Find the first milestone that hasn't passed yet and return its index
  for (const milestone of sortedMilestones) {
    if (timeUntilEvent >= milestone.offset) {
      return milestone.index;
    }
  }

  // All milestones are in the past - return last index (the "All Past" group)
  return milestones.length;
}

/**
 * Generate n8n expression for milestone determination
 *
 * This creates the actual expression that will be used in the switch node.
 * Directly references the webhook trigger node to access event data.
 *
 * @param triggerNodeId - ID of the webhook trigger node containing event data
 * @param milestones - Array of milestone values from the trigger nodes
 * @returns n8n expression string that returns the group index (number)
 */
export function generateMilestoneExpression(
  triggerNodeId: string,
  milestones: string[]
): string {
  // Direct n8n reference to trigger node
  const startTimeExpr = `$("${triggerNodeId}").item.json.body.eventData.startTime`;

  // Create milestones array literal
  const milestonesArray = JSON.stringify(milestones);

  // Return raw expression (will be wrapped with ={{ }} in the transformation)
  return `(() => {
    const startTime = ${startTimeExpr};
    const milestones = ${milestonesArray};
    const now = Date.now();
    const startTimeMs = new Date(startTime).getTime();
    const timeUntilEvent = startTimeMs - now;

    const MILESTONE_OFFSETS = {
      '5_days_before': 5 * 24 * 60 * 60 * 1000,
      '4_days_before': 4 * 24 * 60 * 60 * 1000,
      '3_days_before': 3 * 24 * 60 * 60 * 1000,
      '2_days_before': 2 * 24 * 60 * 60 * 1000,
      '1_day_before': 1 * 24 * 60 * 60 * 1000,
      '1_hour_before': 1 * 60 * 60 * 1000,
      '30_minutes_before': 30 * 60 * 1000,
      '10_minutes_before': 10 * 60 * 1000,
      'event_start': 0,
      'event_completed': 0,
    };

    const beforeMilestones = milestones.filter(m => m !== 'event_completed');
    const sortedMilestones = beforeMilestones
      .map((milestone, index) => ({
        value: milestone,
        offset: MILESTONE_OFFSETS[milestone] || 0,
        index
      }))
      .sort((a, b) => b.offset - a.offset);

    for (const milestone of sortedMilestones) {
      if (timeUntilEvent >= milestone.offset) {
        return milestone.index;
      }
    }

    return milestones.length;
  })()`;
}

/**
 * Determination function metadata for registry
 */
export const milestoneWaitDetermination = {
  name: 'computeNextValidMilestone',
  description: 'Determines next valid milestone based on appointment time',
  generateExpression: generateMilestoneExpression,
  compute: computeNextValidMilestone,
};
