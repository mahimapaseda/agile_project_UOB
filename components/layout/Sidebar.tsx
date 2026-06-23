'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn, getRoleLabel, getStaffRoleLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isParentAccount, isStudentAccount } from '@/lib/access-control';
import { buildNavItems, isNavActive } from '@/lib/nav-config';
import { motion, AnimatePresence } from 'framer-motion';
import { SchoolLogo } from '@/components/SchoolLogo';
import { useMobileNav } from '@/components/layout/mobile-nav';

export function Sidebar() {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileNav();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navItems = buildNavItems(userProfile).filter(
    (item) => !item.show || (userProfile && item.show(userProfile)),
  );

  const initials = userProfile?.displayName
    ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const roleSubtitle =
    userProfile?.accountType === 'staff' && userProfile.staffRole
      ? getStaffRoleLabel(userProfile.staffRole)
      : userProfile
        ? getRoleLabel(userProfile.role)
        : '';

  const renderContent = (collapsed: boolean, isMobile = false) => (
    <div className="sidebar-panel flex h-full flex-col border-r border-blue-800/40">
      {/* Brand header */}
      <div
        className={cn(
          'relative flex items-center gap-3 border-b border-white/10 px-4 py-4',
          collapsed && !isMobile && 'justify-center px-2',
        )}
      >
        <SchoolLogo variant="dark" size={40} className="rounded-xl" />
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight tracking-tight text-white">
              Delta Gemunupura
            </p>
            <p className="text-[11px] font-medium text-blue-300/90">College DBMS</p>
          </div>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="touch-target flex items-center justify-center rounded-xl p-2 text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-touch px-3 py-4">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          const isDisabled = item.disabled;

          return (
            <motion.div
              key={item.href}
              initial={false}
              animate={isMobile ? { opacity: 1, x: 0 } : false}
              transition={isMobile ? { delay: index * 0.04 } : {}}
            >
              <Link
                href={isDisabled ? '#' : item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group relative flex min-h-[44px] items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-800 text-white shadow-sm ring-1 ring-white/15'
                    : 'text-blue-200/90 hover:bg-brand-800/60 hover:text-white',
                  isDisabled && 'pointer-events-none cursor-not-allowed opacity-40',
                  collapsed && !isMobile && 'justify-center px-2',
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-400" />
                )}
                <Icon
                  className={cn(
                    'relative z-10 h-5 w-5 shrink-0',
                    active ? 'text-accent-400' : 'text-blue-300 group-hover:text-blue-100',
                  )}
                />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="relative z-10 flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'relative z-10 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm',
                          item.badge === 'Admin'
                            ? 'bg-accent-400 text-brand-950'
                            : 'bg-white/15 text-blue-100',
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className={cn(
          'border-t border-white/10 bg-brand-950 p-3',
          collapsed && !isMobile && 'flex flex-col items-center gap-2 p-2',
        )}
      >
        {(!collapsed || isMobile) && userProfile && (
          <Link
            href="/dashboard/my-profile"
            className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-brand-800 px-3 py-2.5 outline-none transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-400 shadow-md">
              <span className="text-xs font-bold text-brand-950">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userProfile.displayName}</p>
              <p className="truncate text-[11px] font-medium text-blue-300">{roleSubtitle}</p>
              {(isParentAccount(userProfile) || isStudentAccount(userProfile) || userProfile.accountType === 'staff') &&
                userProfile.linkedId && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-blue-400/80">
                    ID: {userProfile.linkedId}
                  </p>
                )}
            </div>
          </Link>
        )}
        {collapsed && !isMobile && userProfile && (
          <div
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-accent-400 shadow-md"
            title={userProfile.displayName}
          >
            <span className="text-sm font-bold text-brand-950">{initials}</span>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-200/90 transition-all hover:bg-white/10 hover:text-white',
            collapsed && !isMobile && 'h-10 w-10 justify-center px-2',
          )}
          title={collapsed && !isMobile ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/75 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Mobile / tablet drawer */}
      <aside
        className={cn(
          'sidebar-panel fixed inset-y-0 left-0 z-50 w-[min(19rem,90vw)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {renderContent(false, true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sidebar-panel fixed inset-y-0 left-0 z-30 hidden flex-col shadow-xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:flex',
          desktopCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
        )}
      >
        {renderContent(desktopCollapsed)}
        <button
          type="button"
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          className="absolute -right-3 top-[4.5rem] z-40 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-900 shadow-md transition-colors hover:border-blue-200 hover:text-brand-700"
          aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {desktopCollapsed ? (
            <ChevronRight className="ml-0.5 h-4 w-4" />
          ) : (
            <ChevronLeft className="mr-0.5 h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Spacer for desktop layout flow */}
      <div
        className={cn(
          'hidden shrink-0 transition-all duration-300 lg:block',
          desktopCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
        )}
        aria-hidden
      />
    </>
  );
}
