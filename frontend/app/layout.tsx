import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from '../components/app-sidebar';

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler',
  description: 'Production-grade Email Scheduler & Worker Service powered by Next.js, Express, BullMQ, Redis, PostgreSQL, and Ethereal Email.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}
