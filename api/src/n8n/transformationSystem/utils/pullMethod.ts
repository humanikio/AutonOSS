/**
 * Pull Method Utility
 *
 * Retrieves a transformation method from the registry.
 */

import type { Transformation } from '../transformationMethodRegistry/types/transformationMethodTypes';
import { TransformationRegistry } from '../transformationMethodRegistry';

/**
 * Pulls a transformation method from the registry
 *
 * @param methodName - Name of the transformation method
 * @returns The transformation instance
 * @throws Error if method not found
 */
export function pullMethod(methodName: string): Transformation {
  const registry = TransformationRegistry.getInstance();
  const transformation = registry.get(methodName);

  if (!transformation) {
    throw new Error(
      `Transformation method "${methodName}" not found in registry. ` +
      `Available methods: ${Array.from(registry.getAll().keys()).join(', ')}`
    );
  }

  return transformation;
}
