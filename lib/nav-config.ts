import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  Package,
  Calendar,
  Shield,
  Heart,
  Settings,
  GraduationCap,
  BarChart3,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import {
  canAccessStudentsModule,
  canViewStaffDirectory,
  canViewExaminationsPortal,
  canViewExaminationInformation,
  canViewInventory,
  canViewTimetable,
  isAdmin,
  isParentAccount,
  isStudentAccount,
} from '@/lib/access-control';
import { UserProfile } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  show?: (profile: UserProfile) => boolean;
  badge?: string;
  disabled?: boolean;
  /** Shorter label for bottom nav */
  shortLabel?: string;
}

const SETTINGS_NAV: NavItem = {
  label: 'Settings',
  href: '/dashboard/settings',
  icon: Settings,
  shortLabel: 'Settings',
};

function withSettings(items: NavItem[]): NavItem[] {
  return [...items, SETTINGS_NAV];
}

export function buildNavItems(profile: UserProfile | null): NavItem[] {
  if (!profile) {
    return withSettings([{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortLabel: 'Home' }]);
  }

  if (isParentAccount(profile)) {
    return withSettings([
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
      { label: 'My Child', href: '/dashboard/my-child', icon: Heart, shortLabel: 'Child' },
      {
        label: 'Exam Performance Analysis',
        href: '/dashboard/exam-performance',
        icon: BarChart3,
        shortLabel: 'Exams',
      },
      {
        label: 'Timetable',
        href: '/dashboard/timetable',
        icon: Calendar,
        shortLabel: 'Timetable',
        show: canViewTimetable,
      },
    ]);
  }

  if (isStudentAccount(profile)) {
    return withSettings([
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
      { label: 'My Profile', href: '/dashboard/my-profile', icon: GraduationCap, shortLabel: 'Profile' },
      {
        label: 'Exam Performance Analysis',
        href: '/dashboard/exam-performance',
        icon: BarChart3,
        shortLabel: 'Exams',
      },
      {
        label: 'Timetable',
        href: '/dashboard/timetable',
        icon: Calendar,
        shortLabel: 'Timetable',
        show: canViewTimetable,
      },
    ]);
  }

  const items: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
    {
      label: 'Students',
      href: '/dashboard/students',
      icon: Users,
      shortLabel: 'Students',
      show: canAccessStudentsModule,
    },
    {
      label: 'Staff',
      href: '/dashboard/staff',
      icon: UserCheck,
      shortLabel: 'Staff',
      show: canViewStaffDirectory,
    },
    {
      label: 'Exam Information',
      href: '/dashboard/examination-information',
      icon: ClipboardList,
      shortLabel: 'Exam Info',
      show: canViewExaminationInformation,
    },
    {
      label: 'Examinations',
      href: '/dashboard/examinations',
      icon: BookOpen,
      shortLabel: 'Exams',
      show: canViewExaminationsPortal,
    },
    {
      label: 'Inventory',
      href: '/dashboard/inventory',
      icon: Package,
      shortLabel: 'Inventory',
      show: canViewInventory,
    },
    {
      label: 'Timetable',
      href: '/dashboard/timetable',
      icon: Calendar,
      shortLabel: 'Timetable',
      show: canViewTimetable,
    },
  ];

  if (isAdmin(profile)) {
    items.push({
      label: 'User Management',
      href: '/dashboard/admin',
      icon: Shield,
      badge: 'Admin',
      shortLabel: 'Admin',
    });
  }

  return withSettings(items);
}

export function getVisibleNavItems(profile: UserProfile | null): NavItem[] {
  return buildNavItems(profile).filter((item) => !item.show || (profile && item.show(profile)));
}

/** Primary items for mobile bottom bar (max 4 + More). Disabled items (e.g. Timetable) stay in the sidebar only. */
export function getBottomNavItems(profile: UserProfile | null): NavItem[] {
  const visible = getVisibleNavItems(profile).filter((item) => !item.disabled);
  const primary = visible.filter((item) => item.href !== '/dashboard/settings');
  return primary.slice(0, 4);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
