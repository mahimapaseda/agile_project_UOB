'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CircleUser,
  Lock,
  MessageCircle,
  Monitor,
  SlidersHorizontal,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { DisplaySettings } from '@/components/settings/DisplaySettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { WhatsAppIntegrationSettings } from '@/components/settings/WhatsAppIntegrationSettings';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/access-control';
import { cn } from '@/lib/utils';
import { getStaffRoleLabel, getRoleLabel } from '@/lib/utils';

type Section = 'profile' | 'security' | 'display' | 'preferences' | 'whatsapp';

const BASE_SECTIONS: { id: Section; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', description: 'Name, phone and account info', icon: CircleUser },
  { id: 'security', label: 'Security', description: 'Biometric, PIN and password', icon: Lock },
  { id: 'display', label: 'Display', description: 'Text size and layout', icon: Monitor },
  { id: 'preferences', label: 'Notifications', description: 'Alerts and admin shortcuts', icon: SlidersHorizontal },
];

const WHATSAPP_SECTION = {
  id: 'whatsapp' as const,
  label: 'WhatsApp',
  description: 'School messaging account',
  icon: MessageCircle,
};

function isSection(value: string | null): value is Section {
  return (
    value === 'profile'
    || value === 'security'
    || value === 'display'
    || value === 'preferences'
    || value === 'whatsapp'
  );
}

function SettingsLoading() {
  return (
    <>
      <Header title="Settings" />
      <PageMain className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </PageMain>
    </>
  );
}

function SettingsPageContent() {
  const { userProfile, logout, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Section>('profile');
  const [mobileShowContent, setMobileShowContent] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!isSection(tab)) return;
    if (tab === 'whatsapp' && userProfile && !isAdmin(userProfile)) {
      setActive('profile');
      router.replace('/dashboard/settings?tab=profile', { scroll: false });
      return;
    }
    setActive(tab);
    setMobileShowContent(true);
  }, [searchParams, userProfile, router]);

  const selectSection = (id: Section) => {
    setActive(id);
    setMobileShowContent(true);
    router.replace(`/dashboard/settings?tab=${id}`, { scroll: false });
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/login');
  };

  const roleLabel =
    userProfile?.accountType === 'staff' && userProfile.staffRole
      ? getStaffRoleLabel(userProfile.staffRole)
      : userProfile
        ? getRoleLabel(userProfile.role)
        : '';

  const initials =
    userProfile?.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  if (loading) {
    return <SettingsLoading />;
  }

  const sections = userProfile && isAdmin(userProfile)
    ? [...BASE_SECTIONS, WHATSAPP_SECTION]
    : BASE_SECTIONS;
  const activeSection = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <>
      <Header title="Settings" subtitle="Profile, security, display and notifications" />
      <PageMain className="max-w-5xl">
        <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
          <aside
            className={cn(
              'lg:w-64 lg:shrink-0',
              mobileShowContent ? 'hidden lg:block' : 'block',
            )}
          >
            {userProfile && (
              <div className="surface-blue mb-4 flex items-center gap-3 rounded-2xl border border-slate-200/80 px-4 py-3.5 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-blue-900 shadow-inner">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{userProfile.displayName}</p>
                  <p className="truncate text-[11px] text-blue-300">{roleLabel}</p>
                  <p className="truncate font-mono text-[10px] text-blue-400/80">{userProfile.email}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-1" aria-label="Settings sections">
              {sections.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSection(id)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                    active === id
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      active === id
                        ? 'bg-blue-600 text-blue-100'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold', active === id ? 'text-white' : 'text-slate-800')}>
                      {label}
                    </p>
                    <p className={cn('truncate text-[11px]', active === id ? 'text-blue-200' : 'text-slate-500')}>
                      {description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform',
                      active === id ? 'text-blue-200' : 'text-slate-400',
                    )}
                  />
                </button>
              ))}
            </nav>

            <div className="mt-4 rounded-xl border border-red-100 bg-red-50/40">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
                {userProfile && (
                  <span className="ml-auto truncate text-[11px] font-normal text-red-400/80">
                    {userProfile.email}
                  </span>
                )}
              </button>
            </div>
          </aside>

          <div
            className={cn(
              'min-w-0 flex-1',
              mobileShowContent ? 'block' : 'hidden lg:block',
            )}
          >
            <button
              type="button"
              onClick={() => setMobileShowContent(false)}
              className="mb-3 flex items-center gap-1.5 text-sm font-medium text-blue-700 lg:hidden"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Settings
            </button>

            <div className="mb-4 flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <activeSection.icon className="h-5 w-5 text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">{activeSection.label}</h2>
            </div>

            {active === 'profile' && <ProfileSettings />}
            {active === 'security' && <SecuritySettings />}
            {active === 'display' && <DisplaySettings />}
            {active === 'preferences' && <PreferencesSettings />}
            {active === 'whatsapp' && <WhatsAppIntegrationSettings />}
          </div>
        </div>
      </PageMain>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPageContent />
    </Suspense>
  );
}
