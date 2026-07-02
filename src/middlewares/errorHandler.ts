import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle known operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Handle MongoDB duplicate key errors
  if ((err as any).code === 11000) {
    statusCode = 409;
    const keyValue = (err as any).keyValue || {};
    const fields = Object.keys(keyValue);
    const isSlotClash = fields.includes('preferredDate') && fields.includes('preferredTime');
    message = isSlotClash
      ? 'This time slot is already booked.'
      : `A record with this ${fields.join(', ') || 'value'} already exists.`;
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'Image is too large. Maximum size is 5MB.';
    } else {
      message = err.message || 'File upload error';
    }
  }

  // Handle CORS errors
  if (err.message && err.message.includes('not allowed by CORS')) {
    statusCode = 403;
    message = err.message;
  }

  // Log the error
  logger.error(`[${statusCode}] ${message}`, err.stack || '');

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};
