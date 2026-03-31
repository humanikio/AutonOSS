/**
 * Determination Functions Registry
 *
 * Maps trigger types to their runtime determination logic.
 * Used to generate switch node expressions for subflow routing.
 */

import { milestoneWaitDetermination } from './milestoneWait';

/**
 * Determination function interface
 */
export interface DeterminationFunction {
  name: string;
  description: string;
  generateExpression: (triggerNodeId: string, milestones: string[]) => string;
  compute?: (...args: any[]) => string | number; // Can return string (case value) or number (index)
}

/**
 * Registry of determination functions by trigger type
 */
export const determinationFunctionsRegistry: Record<string, DeterminationFunction> = {
  milestoneWait: milestoneWaitDetermination,
  // Future trigger types can be added here
};

/**
 * Get determination function for a specific trigger type
 *
 * @param triggerType - The subflow trigger type (e.g., 'milestoneWait')
 * @returns The determination function metadata
 * @throws Error if trigger type not found in registry
 */
export function getDeterminationFunction(triggerType: string): DeterminationFunction {
  const fn = determinationFunctionsRegistry[triggerType];

  if (!fn) {
    throw new Error(`No determination function found for trigger type: ${triggerType}`);
  }

  return fn;
}

/**
 * Check if determination function exists for a trigger type
 */
export function hasDeterminationFunction(triggerType: string): boolean {
  return triggerType in determinationFunctionsRegistry;
}

/**
 * Get all registered trigger types with determination functions
 */
export function getRegisteredDeterminationTypes(): string[] {
  return Object.keys(determinationFunctionsRegistry);
}
