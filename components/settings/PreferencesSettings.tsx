'use client';

import Link from 'next/link';
import { Bell, MessageCircle, Shield, Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/access-control';
import { cn } from '@/lib/utils';

function ToggleRow({
  label,
  description,
  checked,
  comingSoon,
}: {
  label: string;
  description: string;
  checked: boolean;
  comingSoon?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-4 rounded-xl px-4 py-3.5 transition-colors',
        comingSoon ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>
        {comingSoon && (
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Coming soon
          </span>
        )}
      </div>
      {comingSoon ? (
        <div className="mt-0.5 h-6 w-11 rounded-full bg-slate-200 opacity-50" />
      ) : (
        <div className="mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-200 opacity-50" />
      )}
    </label>
  );
}

export function PreferencesSettings() {
  const { userProfile } = useAuth();
  const isSchoolAdmin = userProfile && isAdmin(userProfile);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <Bell className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            label="Exam result alerts"
            description="Get notified when exam results are published."
            checked={false}
            comingSoon
          />
          <ToggleRow
            label="Attendance alerts"
            description="SMS or email when attendance is marked."
            checked={false}
            comingSoon
          />
        </div>
      </div>

      {isSchoolAdmin && (
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-indigo-100 px-5 py-3.5">
            <Shield className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-indigo-950">Administrator tools</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            <Button asChild className="bg-indigo-700 hover:bg-indigo-800">
              <Link href="/dashboard/admin">
                <Shield className="h-4 w-4" />
                User management
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-green-200 text-green-800 hover:bg-green-50">
              <Link href="/dashboard/settings?tab=whatsapp">
                <MessageCircle className="h-4 w-4" />
                School WhatsApp
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-indigo-200 text-indigo-800 hover:bg-indigo-100">
              <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">
                <Database className="h-4 w-4" />
                Firebase console
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
