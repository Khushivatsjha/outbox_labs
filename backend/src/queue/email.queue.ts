import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: env.EMAIL_MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 2000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

export const scheduleEmailJob = async (emailId: string, scheduledAt: Date) => {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  const job = await emailQueue.add(
    'send-email',
    { emailId },
    {
      delay,
      jobId: emailId, // Deterministic ID ensures deduplication and idempotent re-scheduling
    }
  );
  logger.info({ emailId, jobId: job.id, delayMs: delay }, 'Email scheduled in BullMQ');
  return job;
};

export const cancelEmailJob = async (emailId: string): Promise<boolean> => {
  const job = await emailQueue.getJob(emailId);
  if (job) {
    await job.remove();
    logger.info({ emailId }, 'BullMQ job removed for cancelled email');
    return true;
  }
  return false;
};
