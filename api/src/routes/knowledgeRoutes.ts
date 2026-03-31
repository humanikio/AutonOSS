import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledgeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all knowledge routes
router.use(authenticateToken);

// Business Info routes
router.get('/business-info', KnowledgeController.getBusinessInfo);
router.put('/business-info', KnowledgeController.updateBusinessInfo);

// Products routes
router.get('/products', KnowledgeController.getProducts);
router.post('/products', KnowledgeController.createProduct);
router.put('/products/:id', KnowledgeController.updateProduct);
router.delete('/products/:id', KnowledgeController.deleteProduct);

// FAQ routes
router.get('/faqs', KnowledgeController.getFAQs);
router.post('/faqs', KnowledgeController.createFAQ);
router.put('/faqs/:id', KnowledgeController.updateFAQ);
router.delete('/faqs/:id', KnowledgeController.deleteFAQ);

// Brand Guidelines routes
router.get('/brand-guidelines', KnowledgeController.getBrandGuidelines);
router.put('/brand-guidelines', KnowledgeController.updateBrandGuidelines);

export default router;