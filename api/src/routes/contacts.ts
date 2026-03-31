import { Router } from 'express';
import contactRoutes from '../contacts/routes/contactRoute';

const router = Router();

// Note: Authentication is now handled globally via authenticateEither middleware
// This route accepts both Firebase JWT and API Key authentication

// Mount contact management routes
router.use('/', contactRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Contacts endpoint - Available routes: POST /:tenantId (create), POST /:tenantId/bulk-upload/step1, POST /:tenantId/bulk-upload/step2, POST /:tenantId/bulk-delete, GET /:tenantId/:contactId, DELETE /:tenantId/:contactId, POST /:tenantId/:contactId/manage',
    timestamp: new Date().toISOString()
  });
});

export default router;