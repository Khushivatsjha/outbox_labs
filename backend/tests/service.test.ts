import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailService } from '../src/modules/emails/email.service';
import { emailRepository } from '../src/modules/emails/email.repository';
import * as emailQueue from '../src/queue/email.queue';
import { EmailStatus, EmailEventType } from '@prisma/client';
import { AppError } from '../src/middleware/error-handler';

describe('EmailService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(emailRepository, 'findDuplicateEmail').mockResolvedValue(null);
  });

  describe('scheduleEmail', () => {
    it('should create email, register BullMQ delayed job, and log CREATED and QUEUED events', async () => {
      const emailId = '123e4567-e89b-12d3-a456-426614174000';
      const scheduledAtIso = new Date(Date.now() + 60000).toISOString();

      const createdRecord: any = {
        id: emailId,
        fromEmail: 'sales@reachinbox.test',
        toEmail: 'lead@target.com',
        subject: 'Demo Invitation',
        body: 'Check our scheduler demo',
        scheduledAt: new Date(scheduledAtIso),
        status: EmailStatus.SCHEDULED,
      };

      const updatedRecord: any = {
        ...createdRecord,
        queueJobId: emailId,
      };

      vi.spyOn(emailRepository, 'create').mockResolvedValue(createdRecord);
      const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);
      vi.spyOn(emailQueue, 'scheduleEmailJob').mockResolvedValue({ id: emailId } as any);
      vi.spyOn(emailRepository, 'update').mockResolvedValue(updatedRecord);

      const result = await emailService.scheduleEmail({
        from: 'sales@reachinbox.test',
        to: 'lead@target.com',
        subject: 'Demo Invitation',
        body: 'Check our scheduler demo',
        scheduledAt: scheduledAtIso,
      });

      expect(result.id).toBe(emailId);
      expect(result.queueJobId).toBe(emailId);

      // Verify CREATED and QUEUED events recorded
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId,
          eventType: EmailEventType.CREATED,
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId,
          eventType: EmailEventType.QUEUED,
        })
      );
    });

    it('should handle BullMQ enqueue failure safely by preserving DB record and logging event', async () => {
      const emailId = '123e4567-e89b-12d3-a456-426614174000';
      const scheduledAtIso = new Date(Date.now() + 60000).toISOString();

      const createdRecord: any = {
        id: emailId,
        fromEmail: 'sales@reachinbox.test',
        toEmail: 'lead@target.com',
        subject: 'Demo',
        body: 'Body',
        scheduledAt: new Date(scheduledAtIso),
        status: EmailStatus.SCHEDULED,
      };

      vi.spyOn(emailRepository, 'create').mockResolvedValue(createdRecord);
      const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);
      vi.spyOn(emailQueue, 'scheduleEmailJob').mockRejectedValue(new Error('Redis connection down'));

      const result = await emailService.scheduleEmail({
        from: 'sales@reachinbox.test',
        to: 'lead@target.com',
        subject: 'Demo',
        body: 'Body',
        scheduledAt: scheduledAtIso,
      });

      expect(result.id).toBe(emailId);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId,
          eventType: EmailEventType.FAILED,
          message: expect.stringContaining('Redis connection down'),
        })
      );
    });

    it('should reject scheduling when an identical duplicate email already exists', async () => {
      const scheduledAtIso = new Date(Date.now() + 60000).toISOString();
      vi.spyOn(emailRepository, 'findDuplicateEmail').mockResolvedValue({
        id: 'dup-123',
        status: EmailStatus.SCHEDULED,
      } as any);

      await expect(
        emailService.scheduleEmail({
          from: 'sales@reachinbox.test',
          to: 'lead@target.com',
          subject: 'Demo Invitation',
          body: 'Check our scheduler demo',
          scheduledAt: scheduledAtIso,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('cancelEmail', () => {
    it('should cancel scheduled job in BullMQ, update status to CANCELLED, and log event', async () => {
      const emailId = '123e4567-e89b-12d3-a456-426614174000';
      const emailRecord: any = {
        id: emailId,
        status: EmailStatus.SCHEDULED,
      };

      vi.spyOn(emailRepository, 'findById').mockResolvedValue(emailRecord);
      const cancelJobSpy = vi.spyOn(emailQueue, 'cancelEmailJob').mockResolvedValue(true);
      const updateSpy = vi.spyOn(emailRepository, 'update').mockResolvedValue({
        ...emailRecord,
        status: EmailStatus.CANCELLED,
      });
      const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);

      const result = await emailService.cancelEmail(emailId);

      expect(cancelJobSpy).toHaveBeenCalledWith(emailId);
      expect(updateSpy).toHaveBeenCalledWith(emailId, { status: EmailStatus.CANCELLED });
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId,
          eventType: EmailEventType.CANCELLED,
        })
      );
      expect(result.status).toBe(EmailStatus.CANCELLED);
    });

    it('should throw AppError if attempting to cancel a non-SCHEDULED email', async () => {
      const emailId = '123e4567-e89b-12d3-a456-426614174000';
      const emailRecord: any = {
        id: emailId,
        status: EmailStatus.SENT,
      };

      vi.spyOn(emailRepository, 'findById').mockResolvedValue(emailRecord);

      await expect(emailService.cancelEmail(emailId)).rejects.toThrow(AppError);
    });
  });

  describe('getEmailById', () => {
    it('should throw 404 when email does not exist', async () => {
      vi.spyOn(emailRepository, 'findById').mockResolvedValue(null);

      await expect(emailService.getEmailById('non-existent')).rejects.toThrow(AppError);
    });
  });
});
