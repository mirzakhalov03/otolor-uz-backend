import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    const token = header.slice(7).trim();
    const payload = authService.verifyToken(token);
    req.user = { role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};
