import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimestamp(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '-';
  return ts.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateId(prefix: string): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${random}`;
}

export function calculateAge(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    principal: 'Principal (Admin)',
    technical_officer: 'Technical Officer (Admin)',
    vice_principal: 'Vice Principal',
    staff: 'Teacher / Staff',
    student: 'Student',
    parent: 'Parent',
  };
  return labels[role] || role;
}

export function getStaffRoleLabel(staffRole: string): string {
  const labels: Record<string, string> = {
    principal: 'Principal (Admin)',
    technical_officer: 'Technical Officer (Admin)',
    vice_principal: 'Vice Principal',
    teacher: 'Teacher',
    clerk: 'Clerk / Non-Academic',
  };
  return labels[staffRole] || staffRole;
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    principal: 'bg-purple-100 text-purple-700 border-purple-200',
    technical_officer: 'bg-blue-100 text-blue-700 border-blue-200',
    vice_principal: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    staff: 'bg-green-100 text-green-700 border-green-200',
    student: 'bg-amber-100 text-amber-700 border-amber-200',
    parent: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getStaffRoleBadgeColor(staffRole: string): string {
  const colors: Record<string, string> = {
    principal: 'bg-purple-100 text-purple-700 border-purple-200',
    technical_officer: 'bg-blue-100 text-blue-700 border-blue-200',
    vice_principal: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    teacher: 'bg-green-100 text-green-700 border-green-200',
    clerk: 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return colors[staffRole] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export {
  getLetterGrade,
  getResultLetterGrade,
  getGradeColor,
  getGradeColorForPercentage,
  getResultGradeColor,
  calcSubjectGrade,
  hasFailingSubject,
  isPassingPercentage,
  isPassingResult,
} from './exam-grading';
