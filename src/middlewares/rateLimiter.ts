import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiting middleware to prevent abuse.
 * Configurable via environment variables.
 */
export const rateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // Default: 15 minutes
  max: env.rateLimitMaxRequests,   // Default: 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
