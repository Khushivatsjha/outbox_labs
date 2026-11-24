import { EmailEventType, EmailStatus } from '@prisma/client';
import { emailRepository, ListEmailsOptions } from './email.repository';
import { CreateEmailInput } from './email.validation';
import { scheduleEmailJob, cancelEmailJob } from '../../queue/email.queue';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../utils/logger';

export class EmailService {
  async scheduleEmail(input: CreateEmailInput) {
    const scheduledAt = new Date(input.scheduledAt);

    // 0. Duplicate prevention: check if an identical email already exists (scheduled, processing, or sent)
    const duplicate = await emailRepository.findDuplicateEmail({
      fromEmail: input.from,
      toEmail: input.to,
      subject: input.subject,
      body: input.body,
    });

    if (duplicate) {
      throw new AppError(
        `Duplicate email detected: an identical email to ${input.to} with the same subject and body is already ${duplicate.status.toLowerCase()} and cannot be sent again.`,
        409
      );
    }

    // 1. Persist email record in PostgreSQL with SCHEDULED status
    const createdEmail = await emailRepository.create({
      fromEmail: input.from,
      toEmail: input.to,
      subject: input.subject,
      body: input.body,
      scheduledAt,
      status: EmailStatus.SCHEDULED,
    });

    // 2. Record CREATED event
    await emailRepository.createEvent({
      emailId: createdEmail.id,
      eventType: EmailEventType.CREATED,
      message: 'Email record created in database',
      metadata: {
        scheduledAt: scheduledAt.toISOString(),
      },
    });

    // 3. Register BullMQ delayed job using emailId as deterministic jobId
    try {
      const job = await scheduleEmailJob(createdEmail.id, scheduledAt);

      // 4. Update email record with queueJobId
      const updatedEmail = await emailRepository.update(createdEmail.id, {
        queueJobId: job.id,
      });

      // 5. Record QUEUED event
      await emailRepository.createEvent({
        emailId: createdEmail.id,
        eventType: EmailEventType.QUEUED,
        message: 'Email registered in BullMQ delayed queue',
        metadata: {
          jobId: job.id,
          delayMs: Math.max(0, scheduledAt.getTime() - Date.now()),
        },
      });

      return updatedEmail;
    } catch (queueError: any) {
      logger.error(
        { err: queueError.message, emailId: createdEmail.id },
        'Failed to enqueue job in BullMQ; startup recovery will retry'
      );

      // Email is still safely persisted in PostgreSQL; recovery routine will re-enqueue it
      await emailRepository.createEvent({
        emailId: createdEmail.id,
        eventType: EmailEventType.FAILED,
        message: `Failed initial BullMQ queue registration: ${queueError.message}. Startup recovery will reconcile.`,
      });

      return createdEmail;
    }
  }

  async listEmails(options: ListEmailsOptions) {
    return emailRepository.findMany(options);
  }

  async getEmailById(id: string) {
    const email = await emailRepository.findById(id);
    if (!email) {
      throw new AppError('Email record not found', 404);
    }
    return email;
  }

  async getStats() {
    return emailRepository.getStats();
  }

  async getEvents(emailId: string) {
    const email = await emailRepository.findById(emailId);
    if (!email) {
      throw new AppError('Email record not found', 404);
    }
    return emailRepository.findEventsByEmailId(emailId);
  }

  async cancelEmail(id: string) {
    const email = await emailRepository.findById(id);
    if (!email) {
      throw new AppError('Email record not found', 404);
    }

    if (email.status !== EmailStatus.SCHEDULED) {
      throw new AppError(`Cannot cancel email with status ${email.status}`, 400);
    }

    // Remove BullMQ job
    await cancelEmailJob(id);

    // Update status in PostgreSQL
    const updatedEmail = await emailRepository.update(id, {
      status: EmailStatus.CANCELLED,
    });

    // Record CANCELLED event
    await emailRepository.createEvent({
      emailId: id,
      eventType: EmailEventType.CANCELLED,
      message: 'Email was cancelled by user request',
    });

    return updatedEmail;
  }
}

export const emailService = new EmailService();
