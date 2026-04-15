/**
 * Simple logger utility for consistent logging across the application.
 * Wraps console methods with timestamps and log levels.
 */
export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]): void => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args);
    }
  },
};
