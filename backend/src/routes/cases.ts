import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  res.json({ data: [], total: 0, page: 1, totalPages: 0 });
});

router.post('/', authenticate, async (req, res) => {
  res.status(201).json({ id: '123', ...req.body });
});

router.get('/:id', authenticate, async (req, res) => {
  res.json({ id: req.params.id });
});

router.put('/:id/status', authenticate, async (req, res) => {
  res.json({ id: req.params.id, status: req.body.status });
});

export default router;