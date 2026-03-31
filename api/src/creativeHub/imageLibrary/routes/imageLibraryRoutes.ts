import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { imageLibraryController } from '../controllers/imageLibraryController';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticateEither);

/**
 * POST /api/image-library/upload
 * Upload a new image to the central library
 *
 * Form data:
 * - image: File (required)
 * - tenantId: string (required)
 * - source: string (required) - e.g., "emailTemplate", "contentStudio", "manual"
 * - sourceId: string (optional) - Reference ID from source
 * - purpose: string (optional) - e.g., "header", "icon", "background"
 * - tags: string[] (optional) - JSON array of tags
 */
router.post('/upload', upload.single('image'), imageLibraryController.uploadImage.bind(imageLibraryController));

/**
 * GET /api/image-library/:fileId
 * Get a single image from the library
 *
 * Query params:
 * - tenantId: string (required)
 */
router.get('/:fileId', imageLibraryController.getImage.bind(imageLibraryController));

/**
 * GET /api/image-library
 * List images from the library with optional filtering
 *
 * Query params:
 * - tenantId: string (required)
 * - source: string (optional) - Filter by source
 * - sourceId: string (optional) - Filter by sourceId
 * - tags: string (optional) - Comma-separated tags
 * - limit: number (optional) - Max results (default: 50)
 */
router.get('/', imageLibraryController.listImages.bind(imageLibraryController));

/**
 * PATCH /api/image-library/:fileId
 * Update image metadata
 *
 * Body:
 * - tenantId: string (required)
 * - metadata: object (required) - Fields to update (tags, purpose, etc.)
 */
router.patch('/:fileId', imageLibraryController.updateImageMetadata.bind(imageLibraryController));

/**
 * DELETE /api/image-library/:fileId
 * Delete an image from the library
 *
 * Query params:
 * - tenantId: string (required)
 */
router.delete('/:fileId', imageLibraryController.deleteImage.bind(imageLibraryController));

export default router;
