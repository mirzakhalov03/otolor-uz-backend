import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { Server } from 'http';

let server: Server | null = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      logger.info('HTTP server closed');
    }

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    server = app.listen(env.port, () => {
      logger.info(`🚀 Server running on http://localhost:${env.port}`);
      logger.info(`📚 API Docs: http://localhost:${env.port}/api/docs`);
      logger.info(`🏥 Health Check: http://localhost:${env.port}/api/health`);
      logger.info(`🌍 Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION:', err.message);
  void gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION:', err.message);
  void gracefulShutdown('uncaughtException');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

startServer();
