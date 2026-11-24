import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileScheduledEmails } from '../src/queue/queue-recovery';
import { emailRepository } from '../src/modules/emails/email.repository';
import { emailQueue } from '../src/queue/email.queue';
import { EmailEventType, EmailStatus } from '@prisma/client';

describe('Server Restart Recovery and Queue Reconciliation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reconcile missing BullMQ jobs for pending SCHEDULED emails without creating duplicates', async () => {
    const futureDate = new Date(Date.now() + 120000);
    const pendingEmails = [
      {
        id: 'email-1',
        scheduledAt: futureDate,
        status: EmailStatus.SCHEDULED,
      },
      {
        id: 'email-2',
        scheduledAt: futureDate,
        status: EmailStatus.SCHEDULED,
      },
    ];

    vi.spyOn(emailRepository, 'findScheduledForRecovery').mockResolvedValue(pendingEmails as any);

    // Mock BullMQ: email-1 exists in queue, email-2 is missing
    vi.spyOn(emailQueue, 'getJob').mockImplementation(async (jobId: string) => {
      if (jobId === 'email-1') {
        return { id: 'email-1' } as any;
      }
      return null;
    });

    const addSpy = vi.spyOn(emailQueue, 'add').mockResolvedValue({ id: 'email-2' } as any);
    const eventSpy = vi.spyOn(emailRepository, 'createEvent').mockResolvedValue({} as any);

    const result = await reconcileScheduledEmails();

    expect(result.success).toBe(true);
    expect(result.reconciledCount).toBe(1);
    expect(result.totalPending).toBe(2);

    // Crucial check: only re-added the missing job
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith(
      'send-email',
      { emailId: 'email-2' },
      expect.objectContaining({
        jobId: 'email-2', // Deterministic ID
      })
    );

    // Event recorded
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId: 'email-2',
        eventType: EmailEventType.REQUEUED,
      })
    );
  });

  it('should be completely idempotent when called multiple times consecutively', async () => {
    const futureDate = new Date(Date.now() + 120000);
    const pendingEmails = [
      {
        id: 'email-1',
        scheduledAt: futureDate,
        status: EmailStatus.SCHEDULED,
      },
    ];

    vi.spyOn(emailRepository, 'findScheduledForRecovery').mockResolvedValue(pendingEmails as any);

    // Both times job exists in Redis
    vi.spyOn(emailQueue, 'getJob').mockResolvedValue({ id: 'email-1' } as any);
    const addSpy = vi.spyOn(emailQueue, 'add');

    const result1 = await reconcileScheduledEmails();
    const result2 = await reconcileScheduledEmails();

    expect(result1.reconciledCount).toBe(0);
    expect(result2.reconciledCount).toBe(0);
    expect(addSpy).not.toHaveBeenCalled();
  });
});
