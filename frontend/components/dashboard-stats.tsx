import React from 'react';
import { DashboardStats as StatsType } from '../lib/types';
import { CalendarClock, CheckCircle2, AlertOctagon, Mailbox } from 'lucide-react';

interface DashboardStatsProps {
  stats: StatsType | null;
  loading: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  const cards = [
    {
      label: 'Scheduled Emails',
      value: stats?.scheduled ?? 0,
      icon: CalendarClock,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Sent Successfully',
      value: stats?.sent ?? 0,
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Total Requests',
      value: stats?.total ?? 0,
      icon: Mailbox,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Failed Deliveries',
      value: stats?.failed ?? 0,
      icon: AlertOctagon,
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
      borderColor: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {card.label}
              </p>
              {loading ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value.toLocaleString()}
                </p>
              )}
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.bgColor} ${card.borderColor}`}
            >
              <Icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
