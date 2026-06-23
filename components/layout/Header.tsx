'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getRoleBadgeColor, getRoleLabel, getStaffRoleBadgeColor, getStaffRoleLabel } from '@/lib/utils';
import { isAdmin } from '@/lib/access-control';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useMobileNav } from '@/components/layout/mobile-nav';

interface HeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export function Header({ title, subtitle, backHref, backLabel = 'Back' }: HeaderProps) {
  const { userProfile } = useAuth();
  const { setOpen: setMobileNavOpen } = useMobileNav();

  const initials = userProfile?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const roleLabel =
    userProfile?.accountType === 'staff' && userProfile.staffRole
      ? getStaffRoleLabel(userProfile.staffRole)
      : userProfile
        ? getRoleLabel(userProfile.role)
        : '';

  const roleBadgeClass =
    userProfile?.accountType === 'staff' && userProfile.staffRole
      ? getStaffRoleBadgeColor(userProfile.staffRole)
      : userProfile
        ? getRoleBadgeColor(userProfile.role)
        : 'bg-slate-100 text-slate-700 border-slate-200';

  const showAdminBadge = userProfile && isAdmin(userProfile);

  return (
    <header className="surface-header sticky top-0 z-20 border-b border-slate-200/70 shadow-sm">
      <div className="h-0.5 w-full accent-bar-blue" aria-hidden />

      <div
        className={cn(
          'flex items-center justify-between gap-2 sm:gap-4',
          'min-h-[var(--header-height)] px-3 py-2.5 sm:px-5 md:px-6',
          'pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))]',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 lg:hidden"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg md:text-xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-slate-500 xs:line-clamp-1 xs:text-xs sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {userProfile && (
          <Link href="/dashboard/my-profile" className="shrink-0 outline-none" title="My profile">
            <div
              className={cn(
                'flex items-center rounded-2xl border border-slate-200/90 bg-white shadow-sm',
                'p-1 transition-all hover:border-blue-300/70 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500/50',
                'md:gap-2 md:py-1 md:pl-1 md:pr-3',
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 md:h-9 md:w-9">
                <AvatarFallback className="surface-brand text-sm font-bold text-accent-400">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden min-w-0 md:block">
                <p className="max-w-[8rem] truncate text-sm font-semibold leading-tight text-slate-900 lg:max-w-[10rem]">
                  {userProfile.displayName.split(' ')[0]}
                </p>
                <span
                  className={cn(
                    'mt-0.5 inline-flex max-w-full items-center gap-0.5 truncate rounded-md border px-1.5 py-px text-[9px] font-bold uppercase leading-none tracking-wide',
                    roleBadgeClass,
                  )}
                >
                  {showAdminBadge && <Shield className="h-2 w-2 shrink-0 opacity-80" />}
                  <span className="truncate">{roleLabel.split(' ')[0]}</span>
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
