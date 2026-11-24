import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { emailService } from '../src/modules/emails/email.service';
import { EmailStatus } from '@prisma/client';

describe('Express REST API Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health endpoint summary', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 207]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('dependencies');
      expect(res.body.service).toBe('reachinbox-scheduler-api');
    });
  });

  describe('POST /api/emails', () => {
    it('should reject invalid payload with 400 and validation details', async () => {
      const res = await request(app).post('/api/emails').send({
        from: 'not-an-email',
        to: 'bad-email',
        subject: '',
        body: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Validation failed');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('should schedule email and return 201 when valid', async () => {
      const mockCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fromEmail: 'sender@reachinbox.test',
        toEmail: 'lead@company.test',
        subject: 'Checking in',
        body: 'Hello',
        scheduledAt: new Date(Date.now() + 60000),
        status: EmailStatus.SCHEDULED,
        queueJobId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        etherealPreviewUrl: null,
        lastError: null,
      };

      vi.spyOn(emailService, 'scheduleEmail').mockResolvedValue(mockCreated as any);

      const res = await request(app)
        .post('/api/emails')
        .send({
          from: 'sender@reachinbox.test',
          to: 'lead@company.test',
          subject: 'Checking in',
          body: 'Hello',
          scheduledAt: new Date(Date.now() + 60000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockCreated.id);
      expect(res.body.data.status).toBe(EmailStatus.SCHEDULED);
    });
  });

  describe('GET /api/emails', () => {
    it('should list scheduled and sent emails with pagination metadata', async () => {
      vi.spyOn(emailService, 'listEmails').mockResolvedValue({
        emails: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            fromEmail: 'sales@outbox.ai',
            toEmail: 'client@target.com',
            subject: 'Meeting follow-up',
            body: 'Summary notes',
            scheduledAt: new Date(),
            status: EmailStatus.SCHEDULED,
            queueJobId: '123e4567-e89b-12d3-a456-426614174000',
            sentAt: null,
            etherealPreviewUrl: null,
            lastError: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await request(app).get('/api/emails?status=SCHEDULED&page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emails.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  describe('GET /api/emails/stats', () => {
    it('should return aggregated dashboard counts', async () => {
      vi.spyOn(emailService, 'getStats').mockResolvedValue({
        total: 15,
        scheduled: 7,
        processing: 1,
        sent: 6,
        failed: 1,
        cancelled: 0,
      });

      const res = await request(app).get('/api/emails/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(15);
      expect(res.body.data.scheduled).toBe(7);
      expect(res.body.data.sent).toBe(6);
    });
  });

  describe('GET /api/emails/:id', () => {
    it('should return single email record by UUID', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      vi.spyOn(emailService, 'getEmailById').mockResolvedValue({
        id: uuid,
        fromEmail: 'me@test.com',
        toEmail: 'you@test.com',
        subject: 'Test',
        body: 'Body',
        scheduledAt: new Date(),
        status: EmailStatus.SCHEDULED,
        queueJobId: uuid,
        sentAt: null,
        etherealPreviewUrl: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      } as any);

      const res = await request(app).get(`/api/emails/${uuid}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(uuid);
    });

    it('should return 400 when invalid UUID format is supplied', async () => {
      const res = await request(app).get('/api/emails/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });
});
