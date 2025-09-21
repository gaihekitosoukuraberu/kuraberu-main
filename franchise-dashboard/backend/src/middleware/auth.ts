import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../models/User';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    companyId?: string;
  };
}

const authService = new AuthService();

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('No authorization token provided');
    }
    
    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedError('Invalid token format');
    }
    
    const payload = await authService.validateAccessToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    next();
  };
};

export const requireCompany = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.companyId) {
    return next(new ForbiddenError('Company association required'));
  }
  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      
      if (bearer === 'Bearer' && token) {
        const payload = await authService.validateAccessToken(token);
        req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};