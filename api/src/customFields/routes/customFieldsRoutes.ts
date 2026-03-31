/**
 * Custom Fields Routes
 * API routes for custom field CRUD operations
 */

import { Router } from 'express';
import { customFieldsController } from '../controllers/customFieldsController';
import { customFieldGroupsController } from '../controllers/customFieldGroupsController';

const router = Router();

// NOTE: All routes here inherit authenticateEither from parent router
// This means they accept EITHER Firebase JWT OR API Key
// tenantId is automatically extracted and set on req.tenantId

/**
 * GET /api/customFields
 * Get all custom fields for tenant
 * Query params:
 *   - entityScope: 'contact' | 'opportunity' | etc. (optional)
 *   - group: group ID (optional)
 *   - includeSystem: 'true' | 'false' (default: false - must explicitly opt-in for system fields)
 */
router.get('/', customFieldsController.getAllFields.bind(customFieldsController));

/**
 * GET /api/customFields/fields-list
 * Get fields in a simple format for automation nodes
 * Query params:
 *   - entityScope: 'contact' | 'opportunity' | etc. (required)
 *
 * Returns array of { name: string, displayName: string } for dropdown options
 */
router.get('/fields-list', customFieldsController.getFieldsList.bind(customFieldsController));

/**
 * GET /api/customFields/check-name/:name
 * Check if field name is available
 * Query params:
 *   - entityScope: 'contact' | 'opportunity' | etc. (required)
 */
router.get(
  '/check-name/:name',
  customFieldsController.checkFieldNameAvailability.bind(customFieldsController)
);

// ==================== Field Group Routes ====================
// NOTE: Group routes must come BEFORE /:fieldId to avoid "groups" being matched as a fieldId

/**
 * GET /api/customFields/groups
 * Get all field groups for tenant
 * Query params:
 *   - entityScope: 'contact' | 'opportunity' | etc. (optional)
 */
router.get('/groups', customFieldGroupsController.getAllGroups.bind(customFieldGroupsController));

/**
 * POST /api/customFields/groups
 * Create new field group
 * Body:
 *   - name: string (required, machine name)
 *   - displayName: string (required)
 *   - entityScope: EntityScope (required)
 *   - description: string (optional)
 *   - icon: string (optional)
 *   - color: string (optional)
 *   - order: number (optional)
 */
router.post('/groups', customFieldGroupsController.createGroup.bind(customFieldGroupsController));

/**
 * GET /api/customFields/groups/:groupId
 * Get single field group by ID
 */
router.get('/groups/:groupId', customFieldGroupsController.getGroup.bind(customFieldGroupsController));

/**
 * PUT /api/customFields/groups/:groupId
 * Update field group
 * Body:
 *   - displayName: string (optional)
 *   - description: string (optional)
 *   - icon: string (optional)
 *   - color: string (optional)
 *   - order: number (optional)
 */
router.put('/groups/:groupId', customFieldGroupsController.updateGroup.bind(customFieldGroupsController));

/**
 * DELETE /api/customFields/groups/:groupId
 * Delete field group (cannot delete system groups)
 * Before deletion, removes group reference from all fields using this group
 * All affected fields will be ungrouped (group set to empty string)
 */
router.delete('/groups/:groupId', customFieldGroupsController.deleteGroup.bind(customFieldGroupsController));

// ==================== Field Routes ====================

/**
 * GET /api/customFields/:fieldId
 * Get single custom field by ID
 */
router.get('/:fieldId', customFieldsController.getField.bind(customFieldsController));

/**
 * POST /api/customFields
 * Create new custom field
 * Body:
 *   - name: string (required, machine name)
 *   - displayName: string (required)
 *   - type: FieldType (required)
 *   - entityScope: EntityScope (required)
 *   - description: string (optional)
 *   - group: string (optional)
 *   - placeholder: string (optional)
 *   - validation: FieldValidation (optional)
 *   - order: number (optional)
 */
router.post('/', customFieldsController.createField.bind(customFieldsController));

/**
 * PUT /api/customFields/:fieldId
 * Update custom field
 * Body:
 *   - displayName: string (optional)
 *   - description: string (optional)
 *   - placeholder: string (optional)
 *   - validation: FieldValidation (optional)
 *   - group: string (optional)
 *   - order: number (optional)
 */
router.put('/:fieldId', customFieldsController.updateField.bind(customFieldsController));

/**
 * DELETE /api/customFields/:fieldId
 * Delete custom field (cannot delete system fields)
 */
router.delete('/:fieldId', customFieldsController.deleteField.bind(customFieldsController));

export default router;
