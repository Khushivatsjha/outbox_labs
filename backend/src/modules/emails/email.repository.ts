import { Prisma, Email, EmailEvent, EmailStatus, EmailEventType } from '@prisma/client';
import { prisma } from '../../db/prisma';

export interface ListEmailsOptions {
  status?: EmailStatus;
  page?: number;
  limit?: number;
  search?: string;
}

export class EmailRepository {
  async create(
    data: {
      fromEmail: string;
      toEmail: string;
      subject: string;
      body: string;
      scheduledAt: Date;
      status?: EmailStatus;
      queueJobId?: string;
    },
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<Email> {
    return client.email.create({
      data: {
        fromEmail: data.fromEmail,
        toEmail: data.toEmail,
        subject: data.subject,
        body: data.body,
        scheduledAt: data.scheduledAt,
        status: data.status || EmailStatus.SCHEDULED,
        queueJobId: data.queueJobId,
      },
    });
  }

  async findById(
    id: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<(Email & { events: EmailEvent[] }) | null> {
    return client.email.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findDuplicateEmail(
    data: {
      fromEmail: string;
      toEmail: string;
      subject: string;
      body: string;
    },
    excludeId?: string,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<Email | null> {
    const where: Prisma.EmailWhereInput = {
      fromEmail: data.fromEmail,
      toEmail: data.toEmail,
      subject: data.subject,
      body: data.body,
      status: {
        in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING, EmailStatus.SENT],
      },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return client.email.findFirst({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findMany(options: ListEmailsOptions): Promise<{
    emails: Email[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      where.OR = [
        { subject: { contains: options.search, mode: 'insensitive' } },
        { toEmail: { contains: options.search, mode: 'insensitive' } },
        { fromEmail: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { scheduledAt: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.email.count({ where }),
    ]);

    return {
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats(): Promise<{
    total: number;
    scheduled: number;
    processing: number;
    sent: number;
    failed: number;
    cancelled: number;
  }> {
    const counts = await prisma.email.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    const stats = {
      total: 0,
      scheduled: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    };

    counts.forEach((item) => {
      const count = item._count._all;
      stats.total += count;
      switch (item.status) {
        case EmailStatus.SCHEDULED:
          stats.scheduled = count;
          break;
        case EmailStatus.PROCESSING:
          stats.processing = count;
          break;
        case EmailStatus.SENT:
          stats.sent = count;
          break;
        case EmailStatus.FAILED:
          stats.failed = count;
          break;
        case EmailStatus.CANCELLED:
          stats.cancelled = count;
          break;
      }
    });

    return stats;
  }

  async update(
    id: string,
    data: Prisma.EmailUpdateInput,
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<Email> {
    return client.email.update({
      where: { id },
      data,
    });
  }

  async createEvent(
    data: {
      emailId: string;
      eventType: EmailEventType;
      message: string;
      metadata?: any;
    },
    client: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<EmailEvent> {
    return client.emailEvent.create({
      data: {
        emailId: data.emailId,
        eventType: data.eventType,
        message: data.message,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async findEventsByEmailId(emailId: string): Promise<EmailEvent[]> {
    return prisma.emailEvent.findMany({
      where: { emailId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findScheduledForRecovery(): Promise<Email[]> {
    return prisma.email.findMany({
      where: {
        status: EmailStatus.SCHEDULED,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

export const emailRepository = new EmailRepository();
