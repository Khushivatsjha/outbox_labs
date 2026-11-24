'use client';

import React, { useEffect, useState } from 'react';
import { Email, EmailEvent } from '../lib/types';
import { api } from '../lib/api';
import { formatLocalDateTime } from '../lib/date';
import { StatusBadge } from './status-badge';
import {
  X,
  ExternalLink,
  Calendar,
  Send,
  AlertTriangle,
  History,
  Mail,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface EmailDetailModalProps {
  email: Email | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onClose }) => {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (email?.id) {
      setLoadingEvents(true);
      api
        .getEmailEvents(email.id)
        .then((res) => {
          if (res.success && res.data) {
            setEvents(res.data);
          }
        })
        .catch(() => setEvents([]))
        .finally(() => setLoadingEvents(false));
    }
  }, [email?.id]);

  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-snug truncate max-w-md">
                {email.subject}
              </h3>
              <p className="text-xs text-slate-500 font-mono">ID: {email.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={email.status} />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">From</span>
              <span className="font-semibold text-slate-800">{email.fromEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">To</span>
              <span className="font-semibold text-slate-800">{email.toEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Scheduled For</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {formatLocalDateTime(email.scheduledAt)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Sent Timestamp</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                {formatLocalDateTime(email.sentAt)}
              </span>
            </div>
            {email.queueJobId && (
              <div className="col-span-2">
                <span className="text-slate-500 block mb-0.5">BullMQ Job ID</span>
                <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {email.queueJobId}
                </span>
              </div>
            )}
          </div>

          {/* Ethereal Sandbox Link if available */}
          {email.etherealPreviewUrl && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">Ethereal Test Delivery Complete</p>
                  <p className="text-emerald-700">Preview simulated email in Ethereal web inbox</p>
                </div>
              </div>
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs"
              >
                <span>View test email</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Failure Alert if lastError present */}
          {email.lastError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error Summary</p>
                  <p className="mt-0.5 text-rose-700">{email.lastError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Email Body */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Body
            </h4>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {email.body}
            </div>
          </div>

          {/* Auditable Event Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Event Timeline
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {events.length} logged states
              </span>
            </div>

            {loadingEvents ? (
              <div className="space-y-2">
                <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No events recorded yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                {events.map((evt) => (
                  <div key={evt.id} className="p-3 bg-white hover:bg-slate-50/50 flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase shrink-0">
                      {evt.eventType}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium leading-tight">{evt.message}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatLocalDateTime(evt.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
