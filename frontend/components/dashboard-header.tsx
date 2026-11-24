'use client';

import React from 'react';
import { Plus, Activity, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onOpenCompose?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  onOpenCompose,
  onRefresh,
  isRefreshing,
}) => {
  const [healthStatus, setHealthStatus] = React.useState<'healthy' | 'degraded' | 'offline' | 'checking'>('checking');

  const checkHealth = React.useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHealthStatus(res.status === 'healthy' ? 'healthy' : 'degraded');
    } catch {
      setHealthStatus('offline');
    }
  }, []);

  React.useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <header className="h-16 px-8 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status Pill */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            healthStatus === 'healthy'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : healthStatus === 'degraded'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : healthStatus === 'offline'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title="Backend API & Infrastructure Health"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === 'healthy'
                ? 'bg-emerald-500'
                : healthStatus === 'degraded'
                ? 'bg-amber-500'
                : healthStatus === 'offline'
                ? 'bg-rose-500'
                : 'bg-slate-400'
            }`}
          />
          <Activity className="w-3.5 h-3.5" />
          <span className="capitalize">{healthStatus === 'checking' ? 'Connecting...' : healthStatus}</span>
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Primary Action Button */}
        {onOpenCompose && (
          <button
            onClick={onOpenCompose}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Schedule Email
          </button>
        )}
      </div>
    </header>
  );
};
