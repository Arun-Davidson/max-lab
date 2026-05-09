import { Server } from 'http';
import app from './app';
import config from './config';
import logger from './config/logger';
import { testConnection, syncModels, default as sequelize } from './db/sequelize';

const PORT = config.port;

let server: Server;

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown — must fully release port before ts-node-dev spawns next process
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  const done = () => process.exit(0);

  // Force-kill if cleanup hangs (5s is plenty for ts-node-dev restarts)
  const forceExit = setTimeout(() => {
    logger.warn('Graceful shutdown timed out, forcing exit');
    process.exit(0);
  }, 5000);
  forceExit.unref(); // Don't keep event loop alive just for this timer

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      sequelize.close().then(done).catch(done);
    });
  } else {
    sequelize.close().then(done).catch(done);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
// ts-node-dev sends SIGUSR2 when it restarts a child after a file change
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models (creates tables if they don't exist)
    // In development, this will auto-create/update tables based on models
    // In production, you should use migrations instead
    if (config.env === 'development') {
      logger.info('Synchronizing database models...');
      await syncModels(false);
      // await syncModels(true); // true = drop and recreate all tables (Reset)
      logger.info('Database models synchronized successfully');
    }

    // TODO: Run migrations in production
    // TODO: Initialize background jobs if enabled

    server = app.listen(PORT, () => {
      logger.info(`
        ╔══════════════════════════════════════════════════════════════════════════════════════════╗
        ║                                                                                          ║
        ║  🚀  HIRION Clone API Server                                                             ║
        ║                                                                                          ║
        ║   Environment: ${config.env.padEnd(43)}                                                  ║
        ║   Port: ${PORT.toString().padEnd(50)}                                                    ║
        ║   Base URL: ${config.baseUrl.padEnd(46)}                                                 ║
        ║                                                                                          ║
        ║   Database: PostgreSQL (${config.postgres.host}:${config.postgres.port})${' '.padEnd(20)}║
        ║   Redis: ${config.redis.url.padEnd(50)}                                                  ║
        ║                                                                                          ║
        ║   API Docs: ${config.features.apiDocs ? 'Enabled at /api-docs' : 'Disabled'.padEnd(40)}  ║
        ║                                                                                          ║
        ╚══════════════════════════════════════════════════════════════════════════════════════════╝
      `);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
