import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/accounts', authenticate, async (req, res) => {
  res.json({ data: [] });
});

router.post('/accounts', authenticate, async (req, res) => {
  res.status(201).json({ id: '123', ...req.body });
});

export default router;