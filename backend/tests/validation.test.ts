import { describe, it, expect } from 'vitest';
import { CreateEmailSchema, EmailQuerySchema, EmailIdParamSchema } from '../src/modules/emails/email.validation';

describe('Email Validation Schemas', () => {
  describe('CreateEmailSchema', () => {
    it('should successfully validate a well-formed future email request', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      const input = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Product Demo Followup',
        body: 'Hi there, thank you for checking out ReachInbox!',
        scheduledAt: futureTime,
      };

      const result = CreateEmailSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.from).toBe('sender@example.com');
        expect(result.data.to).toBe('recipient@example.com');
      }
    });

    it('should reject invalid email formats', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      const input = {
        from: 'not-an-email',
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
        scheduledAt: futureTime,
      };

      const result = CreateEmailSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('from');
      }
    });

    it('should reject scheduled times in the past', () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const input = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Hello',
        scheduledAt: pastTime,
      };

      const result = CreateEmailSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('future');
      }
    });

    it('should reject empty subject and empty body', () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      const input = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: '   ',
        body: '',
        scheduledAt: futureTime,
      };

      const result = CreateEmailSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('EmailQuerySchema', () => {
    it('should provide default pagination values', () => {
      const result = EmailQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept valid status enum', () => {
      const result = EmailQuerySchema.safeParse({ status: 'SCHEDULED', page: '2', limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('SCHEDULED');
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });
  });

  describe('EmailIdParamSchema', () => {
    it('should validate valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = EmailIdParamSchema.safeParse({ id: validUuid });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID identifiers', () => {
      const result = EmailIdParamSchema.safeParse({ id: 'invalid-id-123' });
      expect(result.success).toBe(false);
    });
  });
});
