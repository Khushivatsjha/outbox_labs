'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../../components/dashboard-header';
import { EmailTable } from '../../components/email-table';
import { EmailComposeForm } from '../../components/email-compose-form';
import { api } from '../../lib/api';
import { Email, Pagination } from '../../lib/types';
import { Send, CheckCircle2, ExternalLink } from 'lucide-react';

export default function SentPage() {
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

  const loadSentEmails = useCallback(async (page = 1) => {
    setIsRefreshing(true);
    try {
      const res = await api.getEmails({
        status: 'SENT',
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
    loadSentEmails(1);
  }, [loadSentEmails]);

  return (
    <main className="flex-1 flex flex-col">
      <DashboardHeader
        title="Sent Emails"
        subtitle="Delivery records and Ethereal preview inboxes for dispatched jobs."
        onOpenCompose={() => setIsComposeOpen(true)}
        onRefresh={() => loadSentEmails(pagination.page)}
        isRefreshing={isRefreshing}
      />

      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Ethereal Explanation Box */}
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start justify-between gap-4 text-xs text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">Ethereal Email Sandbox Environment</p>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                Ethereal is a safe test SMTP provider. Dispatched messages are never delivered to actual recipients.
                Click <strong className="text-emerald-950">View test email</strong> on any sent item below to preview
                the exact rendered HTML and headers in the Ethereal web inbox.
              </p>
            </div>
          </div>

          <a
            href="https://ethereal.email"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shrink-0 transition-colors shadow-xs"
          >
            <span>Ethereal Info</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Sent Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Delivered Emails ({pagination.total})
            </h2>
          </div>

          <EmailTable
            emails={emails}
            pagination={pagination}
            loading={loading}
            onPageChange={loadSentEmails}
            onActionComplete={() => loadSentEmails(pagination.page)}
            viewMode="sent"
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
              onSuccess={() => loadSentEmails(1)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
