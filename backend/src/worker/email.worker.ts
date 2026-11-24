import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queue/email.queue';
import { redisConnectionOptions } from '../queue/redis';
import { emailRepository } from '../modules/emails/email.repository';
import { sendEmailViaEthereal } from './email-sender';
import { EmailEventType, EmailStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const processEmailJob = async (job: Job<EmailJobData>) => {
  const { emailId } = job.data;
  logger.info({ emailId, jobId: job.id, attempt: job.attemptsMade + 1 }, 'Processing email job');

  const email = await emailRepository.findById(emailId);

  if (!email) {
    logger.warn({ emailId, jobId: job.id }, 'Email record not found in database; skipping');
    return;
  }

  // Idempotency: avoid duplicate sending if already sent
  if (email.status === EmailStatus.SENT) {
    logger.info({ emailId }, 'Email already marked as SENT. Skipping duplicate transmission.');
    return;
  }

  if (email.status === EmailStatus.CANCELLED) {
    logger.info({ emailId }, 'Email has been CANCELLED. Skipping transmission.');
    return;
  }

  // Duplicate email check: ensure no identical email has already been sent or is currently being processed
  const duplicateSent = await emailRepository.findDuplicateEmail(
    {
      fromEmail: email.fromEmail,
      toEmail: email.toEmail,
      subject: email.subject,
      body: email.body,
    },
    email.id
  );

  if (duplicateSent) {
    if (duplicateSent.status === EmailStatus.SENT || duplicateSent.status === EmailStatus.PROCESSING) {
      logger.warn(
        { emailId, duplicateOfId: duplicateSent.id, duplicateStatus: duplicateSent.status },
        'Duplicate email detected: identical email is already sent or processing. Skipping transmission.'
      );

      await emailRepository.update(email.id, {
        status: EmailStatus.FAILED,
        lastError: `Duplicate email detected: identical email (${duplicateSent.id}) is already ${duplicateSent.status.toLowerCase()}.`,
      });

      await emailRepository.createEvent({
        emailId: email.id,
        eventType: EmailEventType.FAILED,
        message: `Duplicate email detected: identical message (${duplicateSent.id}) is already ${duplicateSent.status.toLowerCase()}. Email cannot be sent.`,
        metadata: { duplicateOfId: duplicateSent.id },
      });

      return;
    }
  }

  // Update status to PROCESSING
  await emailRepository.update(email.id, {
    status: EmailStatus.PROCESSING,
  });

  await emailRepository.createEvent({
    emailId: email.id,
    eventType: EmailEventType.PROCESSING,
    message: `Worker processing email on attempt ${job.attemptsMade + 1}`,
    metadata: {
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    },
  });

  try {
    const result = await sendEmailViaEthereal({
      from: email.fromEmail,
      to: email.toEmail,
      subject: email.subject,
      body: email.body,
    });

    // Update status to SENT
    await emailRepository.update(email.id, {
      status: EmailStatus.SENT,
      sentAt: new Date(),
      etherealPreviewUrl: result.previewUrl,
      lastError: null,
    });

    await emailRepository.createEvent({
      emailId: email.id,
      eventType: EmailEventType.SENT,
      message: 'Email successfully sent via Ethereal SMTP',
      metadata: {
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        sentAt: new Date().toISOString(),
      },
    });

    logger.info({ emailId, previewUrl: result.previewUrl }, 'Email sent and recorded successfully');
  } catch (error: any) {
    const isFinalAttempt = job.attemptsMade + 1 >= env.EMAIL_MAX_ATTEMPTS;

    logger.error(
      { err: error.message, emailId, attempt: job.attemptsMade + 1, isFinalAttempt },
      'Failed to send email via Ethereal'
    );

    await emailRepository.update(email.id, {
      status: EmailStatus.FAILED,
      lastError: error.message || 'Unknown SMTP transmission error',
    });

    await emailRepository.createEvent({
      emailId: email.id,
      eventType: EmailEventType.FAILED,
      message: `Failed to deliver email on attempt ${job.attemptsMade + 1}: ${error.message || 'Unknown error'}`,
      metadata: {
        error: error.message,
        attempt: job.attemptsMade + 1,
        isFinalAttempt,
      },
    });

    // Re-throw so BullMQ triggers retry backoff if attempts remaining
    throw error;
  }
};

export const startEmailWorker = () => {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnectionOptions,
    concurrency: env.EMAIL_WORKER_CONCURRENCY,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, emailId: job.data.emailId }, 'Worker completed email job');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, emailId: job?.data.emailId, err: err.message },
      'Worker job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, 'BullMQ worker encountered an internal error');
  });

  logger.info({ concurrency: env.EMAIL_WORKER_CONCURRENCY }, 'BullMQ Email Worker started successfully');
  return worker;
};

// Allow starting worker as standalone process: `node dist/worker/email.worker.js` or `tsx src/worker/email.worker.ts`
if (require.main === module) {
  startEmailWorker();
}
