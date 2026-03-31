import express from 'express';
import multer from 'multer';
import { contactController } from '../controllers/contactController';

// Configure multer for file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const router = express.Router();

/**
 * POST /api/contacts
 * Create a new contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - phoneNumber: string (optional, but required if email not provided)
 * - email: string (optional, but required if phoneNumber not provided)
 * - name: string (optional)
 * - notes: string (optional)
 * - [customFields]: any (optional custom fields)
 *
 * Note: At least one of phoneNumber or email must be provided
 */
router.post('/', contactController.createContact.bind(contactController));

/**
 * POST /api/contacts/bulk-upload/step1
 * Process CSV file and extract fields for mapping
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Expects multipart/form-data with:
 * - csvFile: File (CSV file to process)
 *
 * Returns:
 * - fields: Array of CSV fields with sample values
 * - rowCount: Number of rows in the CSV
 */
router.post('/bulk-upload/step1',
  upload.single('csvFile'),
  contactController.bulkUploadStep1.bind(contactController)
);

/**
 * POST /api/contacts/bulk-upload/step2
 * Create contacts from CSV with field mappings
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Expects multipart/form-data with:
 * - csvFile: File (same CSV file from step 1)
 * - fieldMappings: string (JSON string of field mappings)
 *
 * Returns:
 * - success: number of contacts created
 * - failed: number of failed contacts
 * - errors: array of error messages
 * - createdContactIds: array of created contact IDs
 */
router.post('/bulk-upload/step2',
  upload.single('csvFile'),
  contactController.bulkUploadStep2.bind(contactController)
);

/**
 * POST /api/contacts/bulk-delete
 * Delete multiple contacts
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - contactIds: string[] (array of contact IDs to delete)
 *
 * Returns:
 * - deleted: number of successfully deleted contacts
 * - failed: number of failed deletions
 * - errors: array of error messages
 */
router.post('/bulk-delete', contactController.bulkDeleteContacts.bind(contactController));

/**
 * POST /api/contacts/find
 * Find a contact by phone or email (without creating)
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - channel: "SMS" | "EMAIL" (required)
 * - value: string (phone number or email, required)
 *
 * Returns:
 * - success: boolean
 * - found: boolean
 * - contactId: string | null
 * - contact: object | null (full contact details if found)
 */
router.post('/find', contactController.findContact.bind(contactController));

/**
 * GET /api/contacts/tags
 * Get all contact tags
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - tags: ContactTag[] array
 */
router.get('/tags', contactController.getAllContactTags.bind(contactController));

/**
 * POST /api/contacts/tags
 * Create a new contact tag
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - tagName: string (required)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - tag: ContactTag object
 */
router.post('/tags', contactController.createContactTag.bind(contactController));

/**
 * DELETE /api/contacts/tags/:tagId
 * Delete a contact tag
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - tagId: ID of deleted tag
 */
router.delete('/tags/:tagId', contactController.deleteContactTag.bind(contactController));

/**
 * POST /api/contacts/:contactId/tags/:tagId/add
 * Add a tag to a contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - contactId: ID of contact
 * - tagId: ID of tag added
 */
router.post('/:contactId/tags/:tagId/add', contactController.addContactTag.bind(contactController));

/**
 * POST /api/contacts/:contactId/tags/:tagId/remove
 * Remove a tag from a contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - contactId: ID of contact
 * - tagId: ID of tag removed
 */
router.post('/:contactId/tags/:tagId/remove', contactController.removeContactTag.bind(contactController));

/**
 * POST /api/contacts/:contactId/manage
 * Update contact information
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body can contain any of:
 * - name: string
 * - email: string
 * - notes: string
 * - phoneNumber: string
 * - firstName: string
 * - lastName: string
 * - dateOfBirth: string
 */
router.post('/:contactId/manage', contactController.manageContact.bind(contactController));

/**
 * GET /api/contacts/:contactId/flattened
 * Get contact information in flattened format (for workflow adapters)
 * Returns contact fields as simple key-value pairs instead of array format
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - contactId: string
 * - phoneNumber: string
 * - name: string
 * - email: string
 * - ... (all other contact fields as direct properties)
 */
router.get('/:contactId/flattened', contactController.getContactFlattened.bind(contactController));

/**
 * GET /api/contacts/:contactId
 * Get contact information
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 */
router.get('/:contactId', contactController.getContact.bind(contactController));

/**
 * DELETE /api/contacts/:contactId
 * Delete a single contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - contactId: ID of deleted contact
 */
router.delete('/:contactId', contactController.deleteContact.bind(contactController));

/**
 * POST /api/contacts/:contactId/notes
 * Create a user note for a contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - content: string (required)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 * - note: UserNote object
 */
router.post('/:contactId/notes', contactController.createUserNote.bind(contactController));

/**
 * GET /api/contacts/:contactId/notes
 * Get all user notes for a contact
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - notes: UserNote[] array
 */
router.get('/:contactId/notes', contactController.getUserNotes.bind(contactController));

/**
 * PUT /api/contacts/:contactId/notes/:noteId
 * Update a user note
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Body should contain:
 * - content: string (required)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 */
router.put('/:contactId/notes/:noteId', contactController.updateUserNote.bind(contactController));

/**
 * DELETE /api/contacts/:contactId/notes/:noteId
 * Delete a user note
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Returns:
 * - success: boolean
 * - message: success message
 */
router.delete('/:contactId/notes/:noteId', contactController.deleteUserNote.bind(contactController));

export default router;