import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  mainClassName?: string;
}

/** Consistent mobile/tablet-friendly page wrapper for dashboard routes. */
export function DashboardShell({ title, subtitle, children, mainClassName }: DashboardShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title={title} subtitle={subtitle} />
      <PageMain className={cn(mainClassName)}>{children}</PageMain>
    </div>
  );
}
