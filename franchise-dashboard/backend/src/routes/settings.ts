import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/company', authenticate, async (req, res) => {
  res.json({ id: '123', name: 'Test Company' });
});

router.put('/company', authenticate, async (req, res) => {
  res.json({ success: true });
});

export default router;