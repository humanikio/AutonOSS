import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {},
    message: 'Business info endpoint - Coming soon',
    timestamp: new Date().toISOString()
  });
});

export default router;