/**
 * Custom Fields Module
 * Exports for easy importing
 */

export * from './types';
export { customFieldManager } from './services/customFieldManager';
export { customFieldsController } from './controllers/customFieldsController';
export { default as customFieldsRoutes } from './routes/customFieldsRoutes';

// Field Registry exports
export {
  getSystemFields,
  isSystemFieldName,
  getSystemField,
  getReservedFieldNames,
} from './services/fieldRegistry';
export type { SystemFieldDefinition } from './services/fieldRegistry';
