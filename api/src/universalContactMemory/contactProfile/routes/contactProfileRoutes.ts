import { Router, Request, Response, NextFunction } from 'express';
import { contactProfileController } from '../controllers/contactProfileController';

const router = Router();

// Debug middleware to log incoming requests
const debugContactProfile = (req: Request, res: Response, next: NextFunction) => {
  console.log('=� Contact Profile - Request received:');
  console.log('=� Method:', req.method);
  console.log('= URL:', req.originalUrl);
  console.log('=� Body:', JSON.stringify(req.body, null, 2));
  console.log('� Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * POST /api/universal-contact-memory/contact-profile/:tenantId/:contactId/analyze
 * Analyze contact data and update profile if needed (AI-powered)
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 *
 * Body Parameters:
 * - data: string (required - new contact data to analyze)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: {
 *     updatePerformed: boolean;
 *     profileId: string;
 *     updatedProfile?: string;
 *   };
 * }
 */
router.post(
  '/:tenantId/:contactId/analyze',
  debugContactProfile,
  contactProfileController.analyzeContactData.bind(contactProfileController)
);

/**
 * POST /api/universal-contact-memory/contact-profile/:tenantId/:contactId
 * Create a new contact profile
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 *
 * Body Parameters:
 * - profileId?: string (optional - will be auto-generated if not provided)
 * - data?: object (optional - flexible profile data)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: ContactProfile;
 * }
 */
router.post(
  '/:tenantId/:contactId',
  debugContactProfile,
  contactProfileController.createProfile.bind(contactProfileController)
);

/**
 * GET /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
 * Get a contact profile by ID
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 * - profileId: The profile identifier (required)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: ContactProfile;
 * }
 */
router.get(
  '/:tenantId/:contactId/:profileId',
  debugContactProfile,
  contactProfileController.getProfile.bind(contactProfileController)
);

/**
 * PUT /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
 * Update a contact profile
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 * - profileId: The profile identifier (required)
 *
 * Body Parameters:
 * - data: object (required - updated profile data)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: ContactProfile;
 * }
 */
router.put(
  '/:tenantId/:contactId/:profileId',
  debugContactProfile,
  contactProfileController.updateProfile.bind(contactProfileController)
);

/**
 * DELETE /api/universal-contact-memory/contact-profile/:tenantId/:contactId/:profileId
 * Delete a contact profile
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 * - profileId: The profile identifier (required)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 * }
 */
router.delete(
  '/:tenantId/:contactId/:profileId',
  debugContactProfile,
  contactProfileController.deleteProfile.bind(contactProfileController)
);

/**
 * GET /api/universal-contact-memory/contact-profile/:tenantId/:contactId
 * List all profiles for a contact
 *
 * Path Parameters:
 * - tenantId: The tenant identifier (required)
 * - contactId: The contact identifier (required)
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   data: {
 *     profiles: ContactProfile[];
 *     count: number;
 *   };
 * }
 */
router.get(
  '/:tenantId/:contactId',
  debugContactProfile,
  contactProfileController.listProfiles.bind(contactProfileController)
);

/**
 * GET /api/universal-contact-memory/contact-profile/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'universal-contact-memory-contact-profile',
    timestamp: new Date().toISOString()
  });
});

export default router;
