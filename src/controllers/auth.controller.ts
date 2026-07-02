import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!authService.verifyCredentials(username, password)) {
    throw new AppError('Invalid username or password', 401);
  }

  const token = authService.signToken();
  sendResponse({
    res,
    message: 'Logged in successfully',
    data: { token, expiresIn: env.jwtExpiresIn },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendResponse({
    res,
    message: 'Authenticated',
    data: { role: req.user?.role },
  });
});
