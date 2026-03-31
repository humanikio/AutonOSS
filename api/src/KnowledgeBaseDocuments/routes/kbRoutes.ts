import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { kbController } from '../controllers/kbController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/kb/documents/:docId - Load a document
router.get('/documents/:docId', kbController.loadDocument);

// POST /api/kb/documents - Create a new document
router.post('/documents', kbController.createDocument);

// PUT /api/kb/documents/:docId - Update a document
router.put('/documents/:docId', kbController.updateDocument);

// DELETE /api/kb/documents/:docId - Delete a document
router.delete('/documents/:docId', kbController.deleteDocument);

// GET /api/kb/documents - List all documents for a tenant
router.get('/documents', kbController.listDocuments);

// POST /api/kb/documents/analyze-upload - Analyze an uploaded document
router.post('/documents/analyze-upload', kbController.analyzeUploadedDocument);

export default router;