'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { getBottomNavItems, isNavActive } from '@/lib/nav-config';
import { useMobileNav } from '@/components/layout/mobile-nav';

export function BottomNav() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { setOpen } = useMobileNav();
  const items = getBottomNavItems(userProfile);

  return (
    <nav
      className="surface-header lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'flex min-h-[52px] min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
                active ? 'text-blue-800' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  active ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-500',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
              </span>
              <span className="max-w-full truncate leading-none">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[52px] min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
          aria-label="Open full menu"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500">
            <Menu className="h-[18px] w-[18px]" />
          </span>
          <span className="leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
