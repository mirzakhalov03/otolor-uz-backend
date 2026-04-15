import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware that checks for validation errors from express-validator.
 * If errors exist, returns a 400 response with details.
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors,
    });
    return;
  }

  next();
};
