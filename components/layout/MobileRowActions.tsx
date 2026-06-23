'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MobileRowAction = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

interface MobileRowActionsProps {
  actions: MobileRowAction[];
  className?: string;
}

/** Overflow menu for cramped list rows on phone and tablet. */
export function MobileRowActions({ actions, className }: MobileRowActionsProps) {
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10 shrink-0 touch-target-icon lg:hidden', className)}
          aria-label="More actions"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {visible.map((action, idx) => {
          const item = (
            <DropdownMenuItem
              key={action.label}
              className={cn('gap-2', action.destructive && 'text-red-600 focus:text-red-600')}
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? (
                <Link href={action.href} className="flex w-full items-center gap-2">
                  {action.icon}
                  {action.label}
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  {action.icon}
                  {action.label}
                </span>
              )}
            </DropdownMenuItem>
          );
          const needsSep = action.destructive && idx > 0;
          return needsSep ? (
            <div key={action.label}>
              <DropdownMenuSeparator />
              {item}
            </div>
          ) : (
            item
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
