import { emailRepository } from '../modules/emails/email.repository';
import { emailQueue } from './email.queue';
import { logger } from '../utils/logger';
import { EmailEventType } from '@prisma/client';

/**
 * Reconciles scheduled emails on server startup:
 * Inspects all SCHEDULED email records in PostgreSQL and verifies that their
 * corresponding BullMQ delayed job exists in Redis. If a job is missing (e.g. after Redis restore
 * or dropped job), it re-enqueues it with the correct remaining delay.
 * Fully idempotent.
 */
export const reconcileScheduledEmails = async () => {
  logger.info('Starting queue reconciliation routine...');
  try {
    const pendingEmails = await emailRepository.findScheduledForRecovery();
    logger.info({ pendingCount: pendingEmails.length }, 'Found pending scheduled emails in database');

    let reconciledCount = 0;
    for (const email of pendingEmails) {
      try {
        const existingJob = await emailQueue.getJob(email.id);
        if (!existingJob) {
          const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
          await emailQueue.add(
            'send-email',
            { emailId: email.id },
            {
              delay,
              jobId: email.id,
            }
          );
          await emailRepository.createEvent({
            emailId: email.id,
            eventType: EmailEventType.REQUEUED,
            message: 'Email recovered and re-queued into BullMQ upon server startup reconciliation',
            metadata: { delayMs: delay, recoveredAt: new Date().toISOString() },
          });
          reconciledCount++;
          logger.info({ emailId: email.id, delayMs: delay }, 'Reconciled missing BullMQ job');
        }
      } catch (jobErr: any) {
        logger.error(
          { err: jobErr.message, emailId: email.id },
          'Error checking/re-queuing job during reconciliation'
        );
      }
    }
    logger.info({ reconciledCount, totalPending: pendingEmails.length }, 'Queue reconciliation completed');
    return { success: true, reconciledCount, totalPending: pendingEmails.length };
  } catch (error: any) {
    logger.error({ err: error.message }, 'Queue reconciliation error');
    return { success: false, error: error.message };
  }
};
