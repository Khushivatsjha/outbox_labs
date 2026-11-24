'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getDefaultScheduleTime, getUserTimezone, toUtcIsoTimestamp } from '../lib/date';
import { Mail, Clock, Send, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Email } from '../lib/types';

interface EmailComposeFormProps {
  onSuccess?: (createdEmail: Email) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const EmailComposeForm: React.FC<EmailComposeFormProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const [from, setFrom] = useState('outreach@reachinbox.test');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [tz, setTz] = useState('UTC');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<Email | null>(null);

  useEffect(() => {
    setTz(getUserTimezone());
    const defaults = getDefaultScheduleTime(15);
    setDate(defaults.date);
    setTime(defaults.time);
  }, []);

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};

    if (!from.trim()) {
      errors.from = 'Sender email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim())) {
      errors.from = 'Please enter a valid sender email';
    }

    if (!to.trim()) {
      errors.to = 'Recipient email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      errors.to = 'Please enter a valid recipient email';
    }

    if (!subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!body.trim()) {
      errors.body = 'Email body is required';
    }

    if (!date || !time) {
      errors.datetime = 'Both scheduled date and time are required';
    } else {
      const scheduledIso = toUtcIsoTimestamp(date, time);
      const scheduledMs = new Date(scheduledIso).getTime();
      if (scheduledMs <= Date.now()) {
        errors.datetime = 'Scheduled time must be in the future';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!validateClientSide()) {
      return;
    }

    setSubmitting(true);

    try {
      const scheduledAtIso = toUtcIsoTimestamp(date, time);

      const res = await api.scheduleEmail({
        from: from.trim(),
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt: scheduledAtIso,
      });

      if (res.success && res.data) {
        setSuccessInfo(res.data);
        if (onSuccess) {
          onSuccess(res.data);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule email. Please try again.');
      if (err.details && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        err.details.forEach((d: any) => {
          mapped[d.field] = d.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTo('');
    setSubject('');
    setBody('');
    const defaults = getDefaultScheduleTime(15);
    setDate(defaults.date);
    setTime(defaults.time);
    setSuccessInfo(null);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={`bg-white ${isModal ? 'p-6 max-h-[90vh] overflow-y-auto' : 'p-6 rounded-xl border border-slate-200 shadow-xs'}`}>
      {/* Modal / Form Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Schedule New Email
            </h2>
            <p className="text-xs text-slate-500">
              Dispatched via BullMQ delayed queue and Ethereal SMTP
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successInfo && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm text-emerald-900">Email Successfully Scheduled!</p>
              <p className="mt-1">
                Target: <span className="font-semibold">{successInfo.toEmail}</span>
              </p>
              <p className="mt-0.5 text-emerald-700">
                Scheduled for:{' '}
                <span className="font-semibold">
                  {new Date(successInfo.scheduledAt).toLocaleString()}
                </span>{' '}
                ({tz})
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  Schedule Another
                </button>
                {isModal && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 font-medium rounded-lg text-xs transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to schedule email</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From and To Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              From Email
            </label>
            <input
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="sender@example.com"
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all ${
                fieldErrors.from ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              required
            />
            {fieldErrors.from && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.from}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient (To)
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="lead@company.com"
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all ${
                fieldErrors.to ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              required
            />
            {fieldErrors.to && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.to}</p>
            )}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Quick question regarding your growth goals..."
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all ${
              fieldErrors.subject ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
            }`}
            required
          />
          {fieldErrors.subject && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.subject}</p>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Body
          </label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi there,\n\nI noticed your recent announcement and wanted to connect..."
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all resize-y ${
              fieldErrors.body ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
            }`}
            required
          />
          {fieldErrors.body && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.body}</p>
          )}
        </div>

        {/* Date and Time Picker with Timezone callout */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Schedule Delivery Time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>
              Timezone: <strong className="text-slate-700">{tz}</strong>
            </span>
            <span className="text-[10px] text-slate-400">
              Stored authoritatively as UTC in PostgreSQL
            </span>
          </div>

          {fieldErrors.datetime && (
            <p className="text-[11px] text-rose-600 font-medium">
              {fieldErrors.datetime}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling in BullMQ...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Schedule Email
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
