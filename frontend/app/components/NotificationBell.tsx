'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { useApi } from '../lib/useApi';
import type { AppNotification } from '../lib/types';
import { BellIcon, CheckCircleIcon, InfoIcon, WarningIcon } from './icons';

const POLL_MS = 30_000;

const typeStyle: Record<AppNotification['type'], { icon: typeof InfoIcon; color: string }> = {
  info: { icon: InfoIcon, color: 'bg-blue-50 text-blue-600' },
  success: { icon: CheckCircleIcon, color: 'bg-emerald-50 text-emerald-600' },
  warning: { icon: WarningIcon, color: 'bg-amber-50 text-amber-600' },
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const { data, reload } = useApi<AppNotification[]>('/api/notifications');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read).length;
  const latest = notifications.slice(0, 10);

  // Poll so notifications created by other users/tabs show up.
  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    reload();
  };

  const openNotification = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      await apiFetch(`/api/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => {});
      reload();
    }
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-xs font-medium text-blue-600 hover:underline disabled:cursor-default disabled:text-slate-400 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>
          {latest.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <BellIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {latest.map((n) => {
                const { icon: TypeIcon, color } = typeStyle[n.type];
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-blue-50/40'}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>
                          {n.message}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
