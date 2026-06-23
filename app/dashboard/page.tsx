'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  UserCheck,
  BookOpen,
  TrendingUp,
  Calendar,
  Building2,
  Heart,
  ArrowRight,
  Shield,
  UserPlus,
  KeyRound,
  Zap,
  GraduationCap,
  Monitor,
  CircleUser,
  Lock,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageMain } from '@/components/layout/PageMain';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStudentByAdmissionNumber } from '@/lib/firestore';
import { getDashboardStatsForProfile } from '@/lib/dashboard-stats';
import { DashboardStats, Student } from '@/types';
import { useAuth } from '@/lib/auth-context';
import {
  canManageExams,
  canManageStaff,
  canManageStudents,
  canManageTimetable,
  canViewExaminationsPortal,
  canViewInventory,
  canViewStaffDirectory,
  getLinkedAdmissionNumber,
  isAdmin,
  isParentAccount,
  isStudentAccount,
  isSchoolStaff,
  isTeacher,
  isVicePrincipal,
} from '@/lib/access-control';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="min-w-0 [@media(hover:hover)]:hover:-translate-y-0.5">
      <Card className="h-full overflow-hidden border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-3.5 sm:p-4 md:p-5">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                {label}
              </p>
              <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                {value.toLocaleString()}
              </p>
              {sub ? (
                <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-slate-400 sm:text-xs">{sub}</p>
              ) : null}
            </div>
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner sm:h-12 sm:w-12 sm:rounded-2xl',
                color,
              )}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSection({
  title,
  icon: Icon,
  iconClassName,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('dashboard-section', className)}>
      <header className="dashboard-section-header">
        <Icon className={cn('h-4 w-4 shrink-0 sm:h-5 sm:w-5', iconClassName)} />
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

function StatGridSkeleton({ count }: { count: number }) {
  return (
    <div className="dashboard-stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="dashboard-stat-skeleton" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [linkedStudent, setLinkedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const { userProfile, linkedStaff } = useAuth();

  const isParent = isParentAccount(userProfile);
  const isStudent = isStudentAccount(userProfile);
  const isStaff = isSchoolStaff(userProfile);
  const isSchoolAdmin = isAdmin(userProfile);
  const isViewOnlyLeader = isVicePrincipal(userProfile);
  const gradeScopedTeacher = isTeacher(userProfile);
  const manageStudents = canManageStudents(userProfile);
  const manageStaff = canManageStaff(userProfile);
  const manageExams = canManageExams(userProfile);
  const manageTimetable = canManageTimetable(userProfile);

  useEffect(() => {
    if (!userProfile) return;

    let cancelled = false;

    (async () => {
      try {
        if (isParent || isStudent) {
          const admissionNumber = getLinkedAdmissionNumber(userProfile);
          if (admissionNumber) {
            const s = await getStudentByAdmissionNumber(admissionNumber);
            if (!cancelled) setLinkedStudent(s);
          }
        }

        const s = await getDashboardStatsForProfile(userProfile, linkedStaff);
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) {
          setStats(null);
          setLinkedStudent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userProfile, linkedStaff, isParent, isStudent]);

  const accountSettingsLinks = [
    {
      label: 'Display',
      href: '/dashboard/settings?tab=display',
      icon: Monitor,
      color: 'bg-sky-600',
      textColors: 'text-sky-700 group-hover:text-sky-800',
      desc: 'Text size and layout',
    },
    {
      label: 'Profile',
      href: '/dashboard/settings?tab=profile',
      icon: CircleUser,
      color: 'bg-blue-600',
      textColors: 'text-blue-700 group-hover:text-blue-800',
      desc: 'Name, phone and account',
    },
    {
      label: 'Security',
      href: '/dashboard/settings?tab=security',
      icon: Lock,
      color: 'bg-emerald-600',
      textColors: 'text-emerald-700 group-hover:text-emerald-800',
      desc: 'PIN, password and biometrics',
    },
    {
      label: 'All settings',
      href: '/dashboard/settings',
      icon: Settings,
      color: 'bg-slate-600',
      textColors: 'text-slate-700 group-hover:text-slate-800',
      desc: 'Notifications and more',
    },
  ];

  const accountDisplaySection = (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <DashboardSection title="ACCOUNT & DISPLAY" icon={Settings} iconClassName="text-sky-600">
        <div className="dashboard-quick-grid">
          {accountSettingsLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href} className="dashboard-quick-card group">
                <div className={cn('dashboard-quick-card-icon', link.color)}>
                  <Icon
                    className="dashboard-quick-card-icon-svg h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <div className="dashboard-quick-card-body">
                  <p className={cn('text-sm font-bold leading-snug', link.textColors)}>{link.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
                    {link.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </DashboardSection>
    </motion.div>
  );

  const staffQuickLinks = [
    ...(manageStudents
      ? [
          {
            label: 'Add Student',
            href: '/dashboard/students/new',
            icon: Users,
            color: 'bg-blue-600',
            textColors: 'text-blue-700 group-hover:text-blue-800',
            desc: 'Register a new student',
          },
        ]
      : []),
    ...(manageStaff
      ? [
          {
            label: 'Add Staff',
            href: '/dashboard/staff/new',
            icon: UserCheck,
            color: 'bg-green-600',
            textColors: 'text-green-700 group-hover:text-green-800',
            desc: 'Add a staff member',
          },
        ]
      : []),
    ...(manageExams
      ? [
          {
            label: 'New Examination',
            href: '/dashboard/examinations/new',
            icon: BookOpen,
            color: 'bg-purple-600',
            textColors: 'text-purple-700 group-hover:text-purple-800',
            desc: 'Create an exam record',
          },
        ]
      : []),
    ...(manageTimetable
      ? [
          {
            label: 'New Timetable',
            href: '/dashboard/timetable/new',
            icon: Calendar,
            color: 'bg-violet-600',
            textColors: 'text-violet-700 group-hover:text-violet-800',
            desc: 'Create a class schedule',
          },
        ]
      : []),
    {
      label: gradeScopedTeacher ? 'My students' : 'View Students',
      href: '/dashboard/students',
      icon: GraduationCap,
      color: 'bg-amber-500',
      textColors: 'text-amber-700 group-hover:text-amber-800',
      desc: gradeScopedTeacher ? 'Students in your grades' : 'Browse all students',
    },
    ...(canViewStaffDirectory(userProfile)
      ? [
          {
            label: 'View Staff',
            href: '/dashboard/staff',
            icon: UserCheck,
            color: 'bg-green-600',
            textColors: 'text-green-700 group-hover:text-green-800',
            desc: gradeScopedTeacher ? 'Staff contact directory' : 'Browse staff records',
          },
        ]
      : []),
    ...((gradeScopedTeacher || isViewOnlyLeader) && canViewExaminationsPortal(userProfile)
      ? [
          {
            label: 'Examinations',
            href: '/dashboard/examinations',
            icon: BookOpen,
            color: 'bg-purple-600',
            textColors: 'text-purple-700 group-hover:text-purple-800',
            desc: 'View results and export',
          },
        ]
      : []),
    ...(isViewOnlyLeader && canViewInventory(userProfile)
      ? [
          {
            label: 'Inventory',
            href: '/dashboard/inventory',
            icon: Building2,
            color: 'bg-amber-500',
            textColors: 'text-amber-700 group-hover:text-amber-800',
            desc: 'Browse school inventory',
          },
        ]
      : []),
    {
      label: 'Timetable',
      href: '/dashboard/timetable',
      icon: Calendar,
      color: 'bg-violet-600',
      textColors: 'text-violet-700 group-hover:text-violet-800',
      desc: gradeScopedTeacher ? 'Class schedules' : 'View class timetables',
    },
    {
      label: 'Display',
      href: '/dashboard/settings?tab=display',
      icon: Monitor,
      color: 'bg-sky-600',
      textColors: 'text-sky-700 group-hover:text-sky-800',
      desc: 'Text size and layout',
    },
  ];

  const adminQuickLinks = [
    {
      label: 'User Management',
      href: '/dashboard/admin',
      icon: Shield,
      color: 'bg-indigo-600',
      textColors: 'text-indigo-700 group-hover:text-indigo-800',
      desc: 'Staff, student & parent logins',
    },
    {
      label: 'Add Login Account',
      href: '/dashboard/admin',
      icon: UserPlus,
      color: 'bg-violet-600',
      textColors: 'text-violet-700 group-hover:text-violet-800',
      desc: 'Create a new system user',
    },
    {
      label: 'Staff Records',
      href: '/dashboard/staff',
      icon: UserCheck,
      color: 'bg-green-600',
      textColors: 'text-green-700 group-hover:text-green-800',
      desc: 'Employment records (STF)',
    },
    {
      label: 'All Students',
      href: '/dashboard/students',
      icon: GraduationCap,
      color: 'bg-blue-600',
      textColors: 'text-blue-700 group-hover:text-blue-800',
      desc: 'Enrollment records',
    },
  ];

  const welcomeSubtitle = isSchoolAdmin
    ? 'Administrator — full access to school data and user accounts'
    : isViewOnlyLeader
      ? 'Vice Principal — view-only access to school records'
      : `Welcome back, ${userProfile?.displayName?.split(' ')[0] || 'User'}`;

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header title="Dashboard" subtitle={welcomeSubtitle} />
      <PageMain>
        <div className="dashboard-page">
          {/* Welcome hero */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="dashboard-hero"
          >
            <div className="dashboard-hero-logo" aria-hidden>
              <Image src="/school-logo.png" alt="" fill className="object-contain" sizes="176px" />
            </div>
            <motion.div
              className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl sm:h-64 sm:w-64"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <div className="dashboard-hero-inner">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
                  Delta Gemunupura College
                </h2>
                <p className="mt-1 text-sm font-medium text-blue-100/95 sm:text-base">
                  School Database Management System
                </p>
                <div className="dashboard-hero-badges mt-4">
                  {isSchoolAdmin && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-950 shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      Administrator
                    </span>
                  )}
                  {isViewOnlyLeader && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-950 shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      View only
                    </span>
                  )}
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/15 bg-brand-800 px-2.5 py-1 text-[10px] font-medium text-blue-50 sm:px-3 sm:py-1.5 sm:text-xs">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate sm:whitespace-normal">{todayLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Parent / student linked profile */}
          {(isParent || isStudent) && (
            <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="surface-rose-light overflow-hidden border-rose-200/70 shadow-md">
                <CardContent className="p-4 sm:p-6">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-rose-400 border-t-transparent" />
                    </div>
                  ) : linkedStudent ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-200/60 bg-rose-100 sm:h-16 sm:w-16">
                          <Heart className="h-7 w-7 text-rose-600 sm:h-8 sm:w-8" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 sm:text-xs">
                            {isParent ? 'Your child' : 'Your profile'}
                          </p>
                          <p className="mt-0.5 text-lg font-black leading-tight text-slate-900 sm:text-2xl">
                            {linkedStudent.name}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
                            ID: <span className="font-semibold text-slate-900">{linkedStudent.admissionNumber}</span>
                            {' · '}
                            {linkedStudent.grade}
                            {linkedStudent.section ? ` · Sec ${linkedStudent.section}` : ''}
                          </p>
                          <p className="mt-2 inline-block rounded-md bg-rose-100/60 px-2 py-1 text-[10px] font-medium text-rose-800 sm:text-xs">
                            Viewing limited to this profile and exam results.
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        className="min-h-11 w-full shrink-0 rounded-xl bg-rose-600 hover:bg-rose-700 sm:min-h-10 sm:w-auto"
                      >
                        <Link href={`/dashboard/students/${linkedStudent.id}`}>
                          View details <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="py-4 text-center sm:py-6">
                      <Heart className="mx-auto mb-3 h-10 w-10 text-rose-300 sm:h-12 sm:w-12" />
                      <p className="text-base font-semibold text-slate-800 sm:text-lg">No linked student</p>
                      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 sm:text-sm">
                        Contact the school to link admission number{' '}
                        <strong className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-600">
                          {getLinkedAdmissionNumber(userProfile) || '(not set)'}
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(isParent || isStudent) && (
            <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <DashboardSection title="CLASS TIMETABLE" icon={Calendar} iconClassName="text-violet-600">
                <div className="dashboard-quick-grid">
                  <Link href="/dashboard/timetable" className="dashboard-quick-card group">
                    <div className="dashboard-quick-card-icon bg-violet-600">
                      <Calendar
                        className="dashboard-quick-card-icon-svg h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="dashboard-quick-card-body">
                      <p className="text-sm font-bold leading-snug text-violet-700 group-hover:text-violet-800">
                        View timetable
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
                        Weekly class schedule
                      </p>
                    </div>
                  </Link>
                </div>
              </DashboardSection>
            </motion.div>
          )}

          {(isParent || isStudent) && accountDisplaySection}

          {isStaff && (
            <div className="space-y-6 overflow-visible sm:space-y-8">
              <DashboardSection
                title={gradeScopedTeacher ? 'MY CLASSES' : 'SCHOOL OVERVIEW'}
                icon={TrendingUp}
                iconClassName="text-blue-600"
              >
                {loading ? (
                  <StatGridSkeleton count={gradeScopedTeacher ? 2 : 6} />
                ) : stats ? (
                  <div
                    className={cn(
                      'dashboard-stat-grid',
                      gradeScopedTeacher && 'dashboard-stat-grid--compact',
                    )}
                  >
                    {gradeScopedTeacher ? (
                      <>
                        <StatCard
                          label="My students"
                          value={stats.totalStudents}
                          sub={`${stats.activeStudents} active in your grades`}
                          icon={Users}
                          color="bg-blue-100 text-blue-700"
                        />
                        <StatCard
                          label="Examinations"
                          value={stats.totalExaminations}
                          icon={BookOpen}
                          color="bg-rose-100 text-rose-700"
                        />
                      </>
                    ) : (
                      <>
                        <StatCard
                          label="Total Students"
                          value={stats.totalStudents}
                          sub={`${stats.activeStudents} active`}
                          icon={Users}
                          color="bg-blue-100 text-blue-700"
                        />
                        <StatCard
                          label="Total Staff"
                          value={stats.totalStaff}
                          sub={`${stats.activeStaff} active`}
                          icon={UserCheck}
                          color="bg-green-100 text-green-700"
                        />
                        <StatCard
                          label="Academic Staff"
                          value={stats.academicStaff}
                          icon={GraduationCap}
                          color="bg-purple-100 text-purple-700"
                        />
                        <StatCard
                          label="Non-Academic"
                          value={stats.nonAcademicStaff}
                          icon={Building2}
                          color="bg-amber-100 text-amber-700"
                        />
                        <StatCard
                          label="Examinations"
                          value={stats.totalExaminations}
                          icon={BookOpen}
                          color="bg-rose-100 text-rose-700"
                        />
                        <StatCard
                          label="Active Students"
                          value={stats.activeStudents}
                          sub="Currently enrolled"
                          icon={TrendingUp}
                          color="bg-teal-100 text-teal-700"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Overview stats could not be loaded. Check your connection and refresh the page.
                  </p>
                )}
              </DashboardSection>

              {isSchoolAdmin && stats && (
                <div>
                  <DashboardSection title="SYSTEM ACCESS" icon={KeyRound} iconClassName="text-indigo-600">
                    <div className="dashboard-access-grid">
                      <StatCard
                        label="Staff logins"
                        value={stats.loginAccounts.staffLogins}
                        icon={Shield}
                        color="bg-indigo-50 text-indigo-600"
                      />
                      <StatCard
                        label="Student logins"
                        value={stats.loginAccounts.studentLogins}
                        icon={GraduationCap}
                        color="bg-sky-50 text-sky-600"
                      />
                      <StatCard
                        label="Parent logins"
                        value={stats.loginAccounts.parentLogins}
                        icon={Heart}
                        color="bg-pink-50 text-pink-600"
                      />
                      <StatCard
                        label="Total logins"
                        value={stats.loginAccounts.totalLogins}
                        sub="All portal accounts"
                        icon={KeyRound}
                        color="bg-violet-50 text-violet-600"
                      />
                    </div>
                    <Button
                      asChild
                      className="mt-4 min-h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold hover:bg-indigo-700 sm:mt-5 sm:min-h-10 sm:w-auto"
                    >
                      <Link href="/dashboard/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        Open User Management
                      </Link>
                    </Button>
                  </DashboardSection>
                </div>
              )}

              {accountDisplaySection}

              <div>
                <DashboardSection title="QUICK ACTIONS" icon={Zap} iconClassName="text-amber-500">
                  <div className="dashboard-quick-grid">
                    {(isSchoolAdmin ? adminQuickLinks : staffQuickLinks).map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link key={link.label} href={link.href} className="dashboard-quick-card group">
                          <div className={cn('dashboard-quick-card-icon', link.color)}>
                            <Icon
                              className="dashboard-quick-card-icon-svg h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
                              strokeWidth={2}
                              aria-hidden
                            />
                          </div>
                          <div className="dashboard-quick-card-body">
                            <p className={cn('text-sm font-bold leading-snug', link.textColors)}>{link.label}</p>
                            <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
                              {link.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </DashboardSection>
              </div>
            </div>
          )}
        </div>
      </PageMain>
    </div>
  );
}
