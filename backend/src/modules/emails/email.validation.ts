import { z } from 'zod';
import { EmailStatus } from '@prisma/client';

export const CreateEmailSchema = z.object({
  from: z
    .string()
    .trim()
    .email({ message: 'Invalid sender email address' })
    .max(255, 'Sender email cannot exceed 255 characters'),
  to: z
    .string()
    .trim()
    .email({ message: 'Invalid recipient email address' })
    .max(255, 'Recipient email cannot exceed 255 characters'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(500, 'Subject cannot exceed 500 characters'),
  body: z
    .string()
    .trim()
    .min(1, 'Email body is required')
    .max(50000, 'Email body cannot exceed 50,000 characters'),
  scheduledAt: z
    .string({ required_error: 'Scheduled date and time is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date/time format. Must be an ISO timestamp',
    })
    .refine(
      (val) => {
        const scheduledTime = new Date(val).getTime();
        const now = Date.now();
        // Allow a small grace period of 5 seconds for network latency
        return scheduledTime > now - 5000;
      },
      {
        message: 'Scheduled time must be in the future',
      }
    ),
});

export const EmailQuerySchema = z.object({
  status: z.nativeEnum(EmailStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const EmailIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid email ID format (must be a valid UUID)' }),
});

export type CreateEmailInput = z.infer<typeof CreateEmailSchema>;
export type EmailQueryInput = z.infer<typeof EmailQuerySchema>;
