export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type EmailEventType =
  | 'CREATED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'REQUEUED'
  | 'CANCELLED';

export interface EmailEvent {
  id: string;
  emailId: string;
  eventType: EmailEventType;
  message: string;
  metadata?: any;
  createdAt: string;
}

export interface Email {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  queueJobId?: string | null;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: EmailEvent[];
}

export interface DashboardStats {
  total: number;
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export interface CreateEmailPayload {
  from: string;
  to: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    message: string;
    statusCode?: number;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListEmailsData {
  emails: Email[];
  pagination: Pagination;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  service: string;
  timestamp: string;
  dependencies: {
    database: string;
    redis: string;
    smtp: string;
  };
  environment: string;
}
