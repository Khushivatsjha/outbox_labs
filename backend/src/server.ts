import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { reconcileScheduledEmails } from './queue/queue-recovery';
import { startEmailWorker } from './worker/email.worker';
import { emailQueue } from './queue/email.queue';
import { prisma } from './db/prisma';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 ReachInbox Scheduler API running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
  logger.info(`Frontend Origin: ${env.FRONTEND_ORIGIN}`);

  // Run startup reconciliation for BullMQ queue
  try {
    await reconcileScheduledEmails();
  } catch (reconcileErr: any) {
    logger.warn({ err: reconcileErr.message }, 'Initial queue reconciliation warning (Redis may be offline)');
  }

  // In development, automatically start the worker in-process if not explicitly disabled
  if (process.env.START_WORKER !== 'false') {
    try {
      startEmailWorker();
    } catch (workerErr: any) {
      logger.warn({ err: workerErr.message }, 'Failed to start in-process email worker');
    }
  }
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server and connections...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await emailQueue.close();
      logger.info('BullMQ emailQueue closed.');
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error closing BullMQ queue');
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma database client disconnected.');
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error disconnecting Prisma');
    }

    process.exit(0);
  });

  // Force shutdown after 10s if graceful fails
  setTimeout(() => {
    logger.error('Forcefully terminating process after shutdown timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
