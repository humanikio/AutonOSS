/**
 * Custom Field Resolver - Exports
 *
 * Main entry point for the custom field resolver system.
 * Exports the main resolver function and utilities.
 */

export { resolveCustomFields } from './resolveCustomFields';
export { injectContactFieldAdapter } from './injectContactFieldAdapter';
export { resolveContactCustomFields, hasContactFieldPlaceholders, extractContactFieldNames } from './contactCustomFields';
export * from './graphUtils';

// Re-export types
export type { ReactFlowNode, ReactFlowEdge } from './injectContactFieldAdapter';
