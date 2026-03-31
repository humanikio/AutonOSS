import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { 
  searchAvailableNumbers,
  getAvailableCountries,
  getNumberCapabilities,
  getAreaCodes,
  initiatePurchase,
  getPhoneNumberPricing,
  getPurchasedNumbers,
  manageMessagingServiceController,
  getTenantFromMessagingService
} from '../controllers/phoneNumberController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Search endpoints
router.post('/search', searchAvailableNumbers);
router.get('/countries', getAvailableCountries);
router.get('/capabilities/:countryCode', getNumberCapabilities);
router.get('/area-codes/:countryCode', getAreaCodes);

// Pricing endpoint
router.post('/pricing', getPhoneNumberPricing);

// Purchase endpoint
router.post('/purchase', initiatePurchase);

// Get purchased numbers endpoint
router.get('/purchased', getPurchasedNumbers);

// Messaging service management endpoints
router.post('/manage-messaging-service', manageMessagingServiceController);
router.get('/messaging-service/:messagingServiceId/tenant', getTenantFromMessagingService);

export default router;