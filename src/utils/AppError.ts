/**
 * Custom AppError class for consistent error handling.
 * Extends the native Error class with HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capture stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Factory functions for common HTTP errors
 */
export const NotFoundError = (resource: string): AppError =>
  new AppError(`${resource} not found`, 404);

export const BadRequestError = (message: string): AppError =>
  new AppError(message, 400);

export const ConflictError = (message: string): AppError =>
  new AppError(message, 409);
