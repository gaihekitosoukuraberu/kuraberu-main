import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

const router = Router();
const authService = new AuthService();

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError(errors.array()[0].msg));
  }
  next();
};

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password, deviceId } = req.body;
      const result = await authService.login({ email, password, deviceId });
      
      res.json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post('/logout',
  authenticate,
  async (req: any, res, next) => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.userId, refreshToken);
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);
      
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/change-password
router.post('/change-password',
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  handleValidation,
  async (req: any, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.userId, currentPassword, newPassword);
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  body('email').isEmail().withMessage('Valid email is required'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const message = await authService.requestPasswordReset(email);
      
      res.json({ message });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password
router.post('/reset-password',
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  handleValidation,
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;