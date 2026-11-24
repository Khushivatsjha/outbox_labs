'use client';

import React, { useState } from 'react';
import { Email, Pagination } from '../lib/types';
import { StatusBadge } from './status-badge';
import { formatLocalDateTime } from '../lib/date';
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Inbox,
  Clock,
  Send,
} from 'lucide-react';
import { EmailDetailModal } from './email-detail-modal';
import { api } from '../lib/api';

interface EmailTableProps {
  emails: Email[];
  pagination: Pagination;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onActionComplete?: () => void;
  viewMode?: 'all' | 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  pagination,
  loading,
  onPageChange,
  onActionComplete,
  viewMode = 'all',
}) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (emailId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    setCancellingId(emailId);
    try {
      await api.cancelEmail(emailId);
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel email');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">
                {viewMode === 'sent' ? 'Sent Time' : 'Scheduled Time'}
              </th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Ethereal Preview</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-100 rounded w-48" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-100 rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-100 rounded w-24" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-8 bg-slate-100 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No emails found</p>
                    <p className="text-xs text-slate-400">
                      {viewMode === 'scheduled'
                        ? 'There are currently no scheduled emails in the BullMQ queue.'
                        : viewMode === 'sent'
                        ? 'No emails have been dispatched through Ethereal SMTP yet.'
                        : 'Schedule your first email using the button above.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Recipient */}
                  <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                    <span title={email.toEmail}>{email.toEmail}</span>
                  </td>

                  {/* Subject */}
                  <td className="py-3.5 px-4 text-slate-700 max-w-[240px] truncate">
                    <span title={email.subject}>{email.subject}</span>
                  </td>

                  {/* Scheduled / Sent Date */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {viewMode === 'sent' && email.sentAt ? (
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        {formatLocalDateTime(email.sentAt)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {formatLocalDateTime(email.scheduledAt)}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={email.status} size="sm" />
                  </td>

                  {/* Ethereal Preview URL */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        title="Open test inbox in Ethereal"
                      >
                        <span>View test email</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : email.status === 'SCHEDULED' || email.status === 'PROCESSING' ? (
                      <span className="text-xs text-slate-400 italic">Pending delivery</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Full Details & Event Timeline"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {email.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleCancel(email.id)}
                          disabled={cancellingId === email.id}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Cancel Scheduled Job"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
          <div>
            Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
};
