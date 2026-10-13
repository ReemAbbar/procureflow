'use client';

import { Suspense, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from './Toast';
import { RoleProvider, useRole } from './RoleProvider';
import RoleSwitcher from './RoleSwitcher';
import type { Permission, Role } from '../lib/roles';
import NotificationBell from './NotificationBell';
import { useApi } from '../lib/useApi';
import type { RFQ } from '../lib/types';
import {
  AnalyticsIcon,
  PlusIcon,
  DashboardIcon,
  LogoMark,
  MenuIcon,
  PurchaseOrderIcon,
  RequestsIcon,
  RfqIcon,
  SettingsIcon,
  VendorsIcon,
  XIcon,
} from './icons';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
  badge?: 'rfqs';
  // Shown only when the current role has this permission...
  permission?: Permission;
  // ...or, for role-specific shortcuts, only to these roles.
  roles?: Role[];
};

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon, match: (p) => p === '/', permission: 'dashboard.view' },
  {
    href: '/submit',
    label: 'Submit Request',
    icon: PlusIcon,
    match: (p) => p.startsWith('/submit'),
    roles: ['requester'],
  },
  {
    href: '/requests',
    label: 'Requests',
    icon: RequestsIcon,
    match: (p) => p.startsWith('/requests'),
  },
  {
    href: '/rfqs',
    label: 'RFQs',
    icon: RfqIcon,
    match: (p) => p.startsWith('/rfq'),
    badge: 'rfqs',
    permission: 'rfqs.manage',
  },
  {
    href: '/purchase-orders',
    label: 'Purchase Orders',
    icon: PurchaseOrderIcon,
    match: (p) => p.startsWith('/purchase-orders'),
    permission: 'pos.manage',
  },
  {
    href: '/vendors',
    label: 'Vendors',
    icon: VendorsIcon,
    match: (p) => p.startsWith('/vendors'),
    permission: 'vendors.view',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: AnalyticsIcon,
    match: (p) => p.startsWith('/analytics'),
    permission: 'analytics.view',
  },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, match: (p) => p.startsWith('/settings') },
];

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors';

function NavLinks({
  activePath,
  openRfqs,
  onNavigate,
}: {
  activePath: string | null;
  openRfqs: number;
  onNavigate: () => void;
}) {
  const { role, can } = useRole();
  const items = nav.filter(
    (item) => (!item.permission || can(item.permission)) && (!item.roles || item.roles.includes(role))
  );
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map(({ href, label: baseLabel, icon: NavIcon, match, badge }) => {
        const label = href === '/requests' && !can('requests.viewAll') ? 'My Requests' : baseLabel;
        const active = activePath !== null && match(activePath);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`${linkBase} ${active ? 'bg-[#2d5a8e] shadow-sm' : 'hover:bg-white/10'}`}
          >
            <NavIcon className="h-5 w-5 text-white" />
            <span className="flex-1">{label}</span>
            {badge === 'rfqs' && openRfqs > 0 && (
              <span
                className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white"
                aria-label={`${openRfqs} open RFQs`}
              >
                {openRfqs}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// usePathname suspends while prerendering dynamic routes (e.g. /rfq/[id]) under
// cacheComponents, so it lives in its own leaf wrapped in Suspense.
function ActiveNavLinks(props: { openRfqs: number; onNavigate: () => void }) {
  const pathname = usePathname();
  return <NavLinks activePath={pathname} {...props} />;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </RoleProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { can } = useRole();
  // Only Procurement sees the RFQ nav item, so only fetch the count for them.
  const { data: rfqs } = useApi<RFQ[]>(can('rfqs.manage') ? '/api/rfqs' : null);
  const openRfqs = rfqs?.filter((r) => r.status !== 'awarded').length ?? 0;
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="flex h-screen flex-col bg-slate-50 print:block print:h-auto print:bg-white">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-lg font-semibold tracking-tight text-[#1e3a5f]">ProcureFlow</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-slate-200" />
            <RoleSwitcher />
          </div>
        </header>

        <div className="relative flex flex-1 overflow-hidden print:block print:overflow-visible">
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={closeSidebar} />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-[#1e3a5f] text-white transition-transform md:static md:translate-x-0 print:hidden ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-4 pt-4 md:hidden">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={closeSidebar}
                className="rounded-md p-1.5 text-white hover:bg-white/10"
                aria-label="Close navigation"
              >
                <XIcon />
              </button>
            </div>

            <p className="px-6 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-white/70">
              Workspace
            </p>
            <Suspense
              fallback={<NavLinks activePath={null} openRfqs={openRfqs} onNavigate={closeSidebar} />}
            >
              <ActiveNavLinks openRfqs={openRfqs} onNavigate={closeSidebar} />
            </Suspense>

            <div className="mt-auto border-t border-white/15 p-4">
              <p className="text-xs text-white/70">ProcureFlow · v0.1</p>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
        </div>
      </div>
    </>
  );
}
