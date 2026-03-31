/**
 * Export Transformation Methods
 *
 * Utility to extract transformation method names from skeleton
 * (Mainly for validation and logging)
 */

import type { SessionSkeleton } from '../../state/types';

/**
 * Exports list of transformation method names from skeleton
 *
 * @param skeleton - Session skeleton
 * @returns Array of transformation method names
 */
export function exportTransformationMethods(skeleton: SessionSkeleton): string[] {
  return skeleton.methods.map(task => task.methodName);
}
