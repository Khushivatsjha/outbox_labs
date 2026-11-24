import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processEmailJob } from '../src/worker/email.worker';
import { emailRepository } from '../src/modules/emails/email.repository';
import * as emailSender from '../src/worker/email-sender';
import { EmailStatus, EmailEventType } from '@prisma/client';

describe('Queue Worker and Delivery Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(emailRepository, 'findDuplicateEmail').mockResolvedValue(null);
  });

  it('should process due job, deliver email via Ethereal, and update status to SENT with preview URL', async () => {
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const mockEmail = {
      id: emailId,
      fromEmail: 'test@reachinbox.com',
      toEmail: 'client@ethereal.email',
      subject: 'Scheduled Follow-up',
      body: 'Hello from queue worker',
      scheduledAt: new Date(),
      status: EmailStatus.SCHEDULED,
      events: [],
    };

    vi.spyOn(emailRepository, 'findById').mockResolvedValue(mockEmail as any);
    const updateSpy = vi.spyOn(emailRepository, 'update').mockResolvedValue(mockEmail as any);
    const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);
    vi.spyOn(emailSender, 'sendEmailViaEthereal').mockResolvedValue({
      messageId: '<msg-123@ethereal.email>',
      previewUrl: 'https://ethereal.email/message/msg-123',
    });

    const mockJob: any = {
      id: emailId,
      data: { emailId },
      attemptsMade: 0,
    };

    await processEmailJob(mockJob);

    // Verify status updated to PROCESSING then SENT
    expect(updateSpy).toHaveBeenCalledWith(emailId, { status: EmailStatus.PROCESSING });
    expect(updateSpy).toHaveBeenCalledWith(
      emailId,
      expect.objectContaining({
        status: EmailStatus.SENT,
        etherealPreviewUrl: 'https://ethereal.email/message/msg-123',
      })
    );

    // Verify SENT event recorded
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId,
        eventType: EmailEventType.SENT,
      })
    );
  });

  it('should enforce idempotency and NOT re-send an email that is already marked as SENT', async () => {
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const mockEmail = {
      id: emailId,
      status: EmailStatus.SENT,
      sentAt: new Date(),
    };

    vi.spyOn(emailRepository, 'findById').mockResolvedValue(mockEmail as any);
    const sendSpy = vi.spyOn(emailSender, 'sendEmailViaEthereal');
    const updateSpy = vi.spyOn(emailRepository, 'update');

    const mockJob: any = {
      id: emailId,
      data: { emailId },
      attemptsMade: 0,
    };

    await processEmailJob(mockJob);

    // Crucial requirement: No duplicate sending
    expect(sendSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should NOT send an email if an identical duplicate email has already been sent to the recipient', async () => {
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const mockEmail = {
      id: emailId,
      fromEmail: 'test@reachinbox.com',
      toEmail: 'client@ethereal.email',
      subject: 'Scheduled Follow-up',
      body: 'Hello',
      status: EmailStatus.SCHEDULED,
    };

    vi.spyOn(emailRepository, 'findById').mockResolvedValue(mockEmail as any);
    vi.spyOn(emailRepository, 'findDuplicateEmail').mockResolvedValue({
      id: 'prior-sent-email-id',
      status: EmailStatus.SENT,
    } as any);
    const sendSpy = vi.spyOn(emailSender, 'sendEmailViaEthereal');
    const updateSpy = vi.spyOn(emailRepository, 'update').mockResolvedValue(mockEmail as any);
    const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);

    const mockJob: any = {
      id: emailId,
      data: { emailId },
      attemptsMade: 0,
    };

    await processEmailJob(mockJob);

    // Crucial check: never calls SMTP send
    expect(sendSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(
      emailId,
      expect.objectContaining({
        status: EmailStatus.FAILED,
        lastError: expect.stringContaining('Duplicate'),
      })
    );
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId,
        eventType: EmailEventType.FAILED,
      })
    );
  });

  it('should safely skip emails marked as CANCELLED', async () => {
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const mockEmail = {
      id: emailId,
      status: EmailStatus.CANCELLED,
    };

    vi.spyOn(emailRepository, 'findById').mockResolvedValue(mockEmail as any);
    const sendSpy = vi.spyOn(emailSender, 'sendEmailViaEthereal');

    const mockJob: any = {
      id: emailId,
      data: { emailId },
      attemptsMade: 0,
    };

    await processEmailJob(mockJob);

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should record FAILED status and error details on transmission failure and rethrow for BullMQ retry', async () => {
    const emailId = '123e4567-e89b-12d3-a456-426614174000';
    const mockEmail = {
      id: emailId,
      fromEmail: 'test@reachinbox.com',
      toEmail: 'client@ethereal.email',
      subject: 'Scheduled Follow-up',
      body: 'Hello',
      status: EmailStatus.SCHEDULED,
    };

    vi.spyOn(emailRepository, 'findById').mockResolvedValue(mockEmail as any);
    const updateSpy = vi.spyOn(emailRepository, 'update').mockResolvedValue(mockEmail as any);
    const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);
    vi.spyOn(emailSender, 'sendEmailViaEthereal').mockRejectedValue(
      new Error('SMTP Connection Timed Out')
    );

    const mockJob: any = {
      id: emailId,
      data: { emailId },
      attemptsMade: 0,
    };

    await expect(processEmailJob(mockJob)).rejects.toThrow('SMTP Connection Timed Out');

    expect(updateSpy).toHaveBeenCalledWith(
      emailId,
      expect.objectContaining({
        status: EmailStatus.FAILED,
        lastError: 'SMTP Connection Timed Out',
      })
    );

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId,
        eventType: EmailEventType.FAILED,
      })
    );
  });
});
