/**
 * Grouping Rules Registry
 *
 * Maps trigger types to their corresponding grouping rule implementations.
 * Used to look up the correct grouping strategy based on subflow trigger type.
 */

import { milestoneWaitGrouping, type GroupingRuleFunction } from './milestoneWait';

/**
 * Registry of grouping rules by trigger type
 */
export const groupingRulesRegistry: Record<string, GroupingRuleFunction> = {
  milestoneWait: milestoneWaitGrouping,
  // Future trigger types can be added here
  // Example: reminderSequence: reminderSequenceGrouping
};

/**
 * Get grouping rules for a specific trigger type
 *
 * @param triggerType - The subflow trigger type (e.g., 'milestoneWait')
 * @returns The grouping rule function
 * @throws Error if trigger type not found in registry
 */
export function getGroupingRules(triggerType: string): GroupingRuleFunction {
  const rules = groupingRulesRegistry[triggerType];

  if (!rules) {
    throw new Error(`No grouping rules found for trigger type: ${triggerType}`);
  }

  return rules;
}

/**
 * Check if grouping rules exist for a trigger type
 */
export function hasGroupingRules(triggerType: string): boolean {
  return triggerType in groupingRulesRegistry;
}

/**
 * Get all registered trigger types
 */
export function getRegisteredTriggerTypes(): string[] {
  return Object.keys(groupingRulesRegistry);
}

// Re-export types for convenience
export type { GroupingRuleFunction, SubflowGroup } from './milestoneWait';
