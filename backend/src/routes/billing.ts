import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';

const router = Router();

router.get('/invoice', 
  authenticate, 
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  async (req, res) => {
    res.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  }
);

export default router;