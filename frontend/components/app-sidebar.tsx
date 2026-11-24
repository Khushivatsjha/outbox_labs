'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  Send,
  Mail,
  ExternalLink,
  Globe2,
} from 'lucide-react';
import { getUserTimezone } from '../lib/date';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const [tz, setTz] = React.useState('UTC');

  React.useEffect(() => {
    setTz(getUserTimezone());
  }, []);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Scheduled',
      href: '/scheduled',
      icon: CalendarClock,
      active: pathname === '/scheduled',
    },
    {
      label: 'Sent Emails',
      href: '/sent',
      icon: Send,
      active: pathname === '/sent',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-base leading-tight block tracking-tight">
            ReachInbox
          </span>
          <span className="text-[11px] font-medium text-slate-500 block">
            Email Scheduler
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Overview
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  item.active ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        {/* User Timezone indicator */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Globe2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Local Timezone</span>
          </div>
          <p className="font-semibold text-slate-700 truncate" title={tz}>
            {tz}
          </p>
        </div>

        {/* Ethereal test inbox callout */}
        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
          <div className="font-semibold flex items-center justify-between mb-1">
            <span>Ethereal SMTP</span>
            <a
              href="https://ethereal.email"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-blue-800 leading-snug">
            Safe testing sandbox. Real recipients never receive actual emails.
          </p>
        </div>
      </div>
    </aside>
  );
};
