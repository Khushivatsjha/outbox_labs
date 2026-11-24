'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../../components/dashboard-header';
import { EmailTable } from '../../components/email-table';
import { EmailComposeForm } from '../../components/email-compose-form';
import { api } from '../../lib/api';
import { Email, Pagination } from '../../lib/types';
import { Clock, Info } from 'lucide-react';

export default function ScheduledPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const loadScheduledEmails = useCallback(async (page = 1) => {
    setIsRefreshing(true);
    try {
      const res = await api.getEmails({
        status: 'SCHEDULED',
        page,
        limit: 15,
      });

      if (res.success && res.data) {
        setEmails(res.data.emails);
        setPagination(res.data.pagination);
      }
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadScheduledEmails(1);
  }, [loadScheduledEmails]);

  return (
    <main className="flex-1 flex flex-col">
      <DashboardHeader
        title="Scheduled Emails"
        subtitle="Queued in BullMQ awaiting target dispatch timestamp."
        onOpenCompose={() => setIsComposeOpen(true)}
        onRefresh={() => loadScheduledEmails(pagination.page)}
        isRefreshing={isRefreshing}
      />

      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Info Banner */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-950">Deterministic BullMQ Delayed Jobs</p>
            <p className="text-blue-800 mt-0.5 leading-relaxed">
              Every scheduled email is persisted in PostgreSQL as the source of truth and enqueued in BullMQ Redis
              with a calculated millisecond delay. Upon server restart, our automatic recovery reconciliation
              verifies and re-enqueues any missing jobs idempotently.
            </p>
          </div>
        </div>

        {/* Scheduled Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Active Queued Jobs ({pagination.total})
            </h2>
          </div>

          <EmailTable
            emails={emails}
            pagination={pagination}
            loading={loading}
            onPageChange={loadScheduledEmails}
            onActionComplete={() => loadScheduledEmails(pagination.page)}
            viewMode="scheduled"
          />
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-150">
            <EmailComposeForm
              isModal
              onClose={() => setIsComposeOpen(false)}
              onSuccess={() => loadScheduledEmails(1)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
