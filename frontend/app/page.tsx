'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../components/dashboard-header';
import { DashboardStats } from '../components/dashboard-stats';
import { EmailTable } from '../components/email-table';
import { EmailComposeForm } from '../components/email-compose-form';
import { api } from '../lib/api';
import { Email, DashboardStats as StatsType, Pagination } from '../lib/types';
import { Sparkles, CalendarClock, Send, Inbox } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [emails, setEmails] = useState<Email[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'SCHEDULED' | 'SENT'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (page = 1, statusTab = activeTab) => {
    setIsRefreshing(true);
    try {
      // 1. Fetch live dashboard counts from API
      const statsRes = await api.getStats().catch(() => null);
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } finally {
      setStatsLoading(false);
    }

    try {
      // 2. Fetch email list from API
      const statusFilter = statusTab === 'all' ? undefined : statusTab;
      const emailRes = await api.getEmails({
        page,
        limit: 10,
        status: statusFilter,
      });

      if (emailRes.success && emailRes.data) {
        setEmails(emailRes.data.emails);
        setPagination(emailRes.data.pagination);
      }
    } catch {
      setEmails([]);
    } finally {
      setTableLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData(1, activeTab);
  }, [loadData, activeTab]);

  const handlePageChange = (newPage: number) => {
    loadData(newPage, activeTab);
  };

  const handleComposeSuccess = () => {
    loadData(1, activeTab);
  };

  return (
    <main className="flex-1 flex flex-col">
      <DashboardHeader
        title="Dashboard"
        subtitle="Manage delayed email dispatches, worker state, and Ethereal test deliveries."
        onOpenCompose={() => setIsComposeOpen(true)}
        onRefresh={() => loadData(pagination.page, activeTab)}
        isRefreshing={isRefreshing}
      />

      <div className="p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
        {/* KPI Stats Cards */}
        <section>
          <DashboardStats stats={stats} loading={statsLoading} />
        </section>

        {/* Activity Feed Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Recent Scheduler Activity
              </h2>
              <p className="text-xs text-slate-500">
                Live records queried from PostgreSQL and BullMQ
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Activity
              </button>
              <button
                onClick={() => setActiveTab('SCHEDULED')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SCHEDULED'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                Scheduled ({stats?.scheduled ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('SENT')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SENT'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Sent ({stats?.sent ?? 0})
              </button>
            </div>
          </div>

          <EmailTable
            emails={emails}
            pagination={pagination}
            loading={tableLoading}
            onPageChange={handlePageChange}
            onActionComplete={() => loadData(pagination.page, activeTab)}
            viewMode={activeTab === 'SENT' ? 'sent' : activeTab === 'SCHEDULED' ? 'scheduled' : 'all'}
          />
        </section>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-150">
            <EmailComposeForm
              isModal
              onClose={() => setIsComposeOpen(false)}
              onSuccess={handleComposeSuccess}
            />
          </div>
        </div>
      )}
    </main>
  );
}
