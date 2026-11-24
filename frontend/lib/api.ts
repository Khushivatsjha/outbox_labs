import {
  ApiResponse,
  DashboardStats,
  Email,
  EmailEvent,
  EmailStatus,
  HealthStatus,
  ListEmailsData,
  CreateEmailPayload,
} from './types';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers as Record<string, string>),
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          data?.message ||
          `API request failed with status ${response.status}`;
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.details = data?.error?.details;
        throw error;
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(
          `Unable to reach backend service at ${API_BASE}. Ensure the Express API is running.`
        );
      }
      throw err;
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health');
  }

  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>('/emails/stats');
  }

  async getEmails(options?: {
    status?: EmailStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<ListEmailsData>> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.search) params.append('search', options.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiResponse<ListEmailsData>>(`/emails${query}`);
  }

  async getEmailById(id: string): Promise<ApiResponse<Email>> {
    return this.request<ApiResponse<Email>>(`/emails/${id}`);
  }

  async getEmailEvents(id: string): Promise<ApiResponse<EmailEvent[]>> {
    return this.request<ApiResponse<EmailEvent[]>>(`/emails/${id}/events`);
  }

  async scheduleEmail(payload: CreateEmailPayload): Promise<ApiResponse<Email>> {
    return this.request<ApiResponse<Email>>('/emails', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async cancelEmail(id: string): Promise<ApiResponse<Email>> {
    return this.request<ApiResponse<Email>>(`/emails/${id}/cancel`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
