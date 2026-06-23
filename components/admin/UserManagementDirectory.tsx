'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  UserCheck,
  GraduationCap,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Users,
  Shield,
  Pencil,
  MessageCircle,
  KeySquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getStaffList, getStudents, getUsers } from '@/lib/firestore';
import {
  requestMigrateStudentLoginEmails,
  requestProvisionStudentLogin,
  requestSetLoginActive,
  type ProvisionStudentLoginResponse,
} from '@/lib/admin-auth-client';
import { isLegacySyntheticStudentEmail } from '@/lib/student-login-credentials';
import { auth } from '@/lib/firebase';
import {
  filterByLoginStatus,
  mergeStaffWithLogins,
  mergeStudentsWithLogins,
  parentLoginPrefill,
  staffLoginPrefill,
  studentLoginPrefill,
  type LoginFilter,
  type StaffWithLogin,
  type StudentWithLogins,
} from '@/lib/user-management';
import { UserProfile } from '@/types';
import { getStaffRoleBadgeColor, getStaffRoleLabel, cn } from '@/lib/utils';
import { StatIconBadge } from '@/components/ui/StatIconBadge';
import { useAuth } from '@/lib/auth-context';
import { AddUserDialog, type UserLoginPrefill } from '@/components/admin/AddUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { quickPinSkippedNotice } from '@/lib/firebase-admin-config-message';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { StudentProfilePhoto } from '@/components/students/StudentProfilePhoto';
import { StudentCredentialShareDialog } from '@/components/admin/StudentCredentialShareDialog';
const StudentBulkProvisionDialog = dynamic(
  () =>
    import('@/components/admin/StudentBulkProvisionDialog').then((m) => ({
      default: m.StudentBulkProvisionDialog,
    })),
  { ssr: false },
);
import { GRADES, Student } from '@/types';
import {
  formatClassSection,
  isAdvancedLevelGrade,
  normalizeClassSection,
} from '@/lib/grade-class-options';

type TabKey = 'staff' | 'students';
const FILTER_ALL = 'all';

function classFilterLabel(grade: string, section: string): string {
  return formatClassSection(grade, section) || section;
}

function studentMatchesClassFilter(student: Student, classFilter: string): boolean {
  if (classFilter === FILTER_ALL) return true;
  const normalized = normalizeClassSection(student.grade, student.section);
  return normalized.toLowerCase() === classFilter.toLowerCase();
}

function LoginFilterPills({
  value,
  onChange,
  withCount,
  withoutCount,
  extraOptions,
}: {
  value: LoginFilter;
  onChange: (v: LoginFilter) => void;
  withCount: number;
  withoutCount: number;
  extraOptions?: { key: LoginFilter; label: string; count?: number }[];
}) {
  const options: { key: LoginFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'with_login', label: 'Has login', count: withCount },
    { key: 'without_login', label: 'No login', count: withoutCount },
    ...(extraOptions ?? []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            'touch-target-pill shrink-0 rounded-full px-3 text-xs font-semibold transition-all',
            value === opt.key
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          {opt.label}
          {opt.count !== undefined ? ` (${opt.count})` : ''}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <StatIconBadge icon={Icon} accent={accent} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-slate-900">{value}</p>
        {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export function UserManagementDirectory() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [staffRows, setStaffRows] = useState<StaffWithLogin[]>([]);
  const [studentRows, setStudentRows] = useState<StudentWithLogins[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('staff');
  const [staffLoginFilter, setStaffLoginFilter] = useState<LoginFilter>('all');
  const [studentLoginFilter, setStudentLoginFilter] = useState<LoginFilter>('all');
  const [studentGradeFilter, setStudentGradeFilter] = useState(FILTER_ALL);
  const [studentClassFilter, setStudentClassFilter] = useState(FILTER_ALL);
  const [addPrefill, setAddPrefill] = useState<UserLoginPrefill | undefined>();
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [pageNotice, setPageNotice] = useState('');
  const [shareResult, setShareResult] = useState<ProvisionStudentLoginResponse | null>(null);
  const [showBulkProvision, setShowBulkProvision] = useState(false);
  const [provisioningAdmission, setProvisioningAdmission] = useState<string | null>(null);
  const [migratingEmails, setMigratingEmails] = useState(false);

  const applyData = useCallback(
    (staff: Awaited<ReturnType<typeof getStaffList>>, students: Awaited<ReturnType<typeof getStudents>>, logins: UserProfile[]) => {
      setUsers(logins);
      setStaffRows(mergeStaffWithLogins(staff, logins));
      setStudentRows(mergeStudentsWithLogins(students, logins));
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, students, logins] = await Promise.all([
        getStaffList(),
        getStudents(),
        getUsers(),
      ]);
      applyData(staff, students, logins);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    if (!userProfile) return;
    void load();
  }, [userProfile, load]);

  useEffect(() => {
    setStudentClassFilter(FILTER_ALL);
  }, [studentGradeFilter]);

  const staffWithLogin = staffRows.filter((r) => r.login).length;
  const staffWithoutLogin = staffRows.length - staffWithLogin;
  const studentsWithLogin = studentRows.filter((r) => r.studentLogin).length;
  const studentsWithoutLogin = studentRows.length - studentsWithLogin;
  const studentsWithTempPassword = studentRows.filter(
    (r) => r.studentLogin?.mustChangePassword === true,
  ).length;
  const parentLogins = users.filter((u) => u.accountType === 'parent').length;
  const legacyStudentLoginCount = useMemo(
    () =>
      studentRows.filter(
        ({ studentLogin }) => studentLogin && isLegacySyntheticStudentEmail(studentLogin.email),
      ).length,
    [studentRows],
  );

  const q = search.trim().toLowerCase();

  const filteredStaff = useMemo(() => {
    let rows = filterByLoginStatus(staffRows, staffLoginFilter, 'login');
    if (q) {
      rows = rows.filter(
        ({ staff, login }) =>
          staff.name.toLowerCase().includes(q) ||
          staff.staffId.toLowerCase().includes(q) ||
          staff.designation.toLowerCase().includes(q) ||
          (login?.email.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [staffRows, staffLoginFilter, q]);

  const studentGradeOptions = useMemo(() => {
    const present = new Set(studentRows.map(({ student }) => student.grade));
    return GRADES.filter((g) => present.has(g));
  }, [studentRows]);

  const studentClassOptions = useMemo(() => {
    const pool =
      studentGradeFilter === FILTER_ALL
        ? studentRows
        : studentRows.filter(({ student }) => student.grade === studentGradeFilter);
    const seen = new Map<string, string>();
    for (const { student } of pool) {
      const normalized = normalizeClassSection(student.grade, student.section);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, classFilterLabel(student.grade, normalized));
      }
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [studentRows, studentGradeFilter]);

  const hasStudentDirectoryFilters =
    studentGradeFilter !== FILTER_ALL || studentClassFilter !== FILTER_ALL;

  const filteredStudents = useMemo(() => {
    let rows = filterByLoginStatus(studentRows, studentLoginFilter, 'studentLogin');
    if (studentGradeFilter !== FILTER_ALL) {
      rows = rows.filter(({ student }) => student.grade === studentGradeFilter);
    }
    if (studentClassFilter !== FILTER_ALL) {
      rows = rows.filter(({ student }) => studentMatchesClassFilter(student, studentClassFilter));
    }
    if (q) {
      rows = rows.filter(
        ({ student, studentLogin, parentLogin }) =>
          student.name.toLowerCase().includes(q) ||
          student.admissionNumber.toLowerCase().includes(q) ||
          student.parentName.toLowerCase().includes(q) ||
          (studentLogin?.email.toLowerCase().includes(q) ?? false) ||
          (parentLogin?.email.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [studentRows, studentLoginFilter, studentGradeFilter, studentClassFilter, q]);

  const patchLoginInLists = (updated: UserProfile) => {
    setUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
    setStaffRows((prev) =>
      prev.map((row) =>
        row.login?.uid === updated.uid ? { ...row, login: updated } : row,
      ),
    );
    setStudentRows((prev) =>
      prev.map((row) => ({
        ...row,
        studentLogin: row.studentLogin?.uid === updated.uid ? updated : row.studentLogin,
        parentLogin: row.parentLogin?.uid === updated.uid ? updated : row.parentLogin,
      })),
    );
  };

  const toggleActive = async (login: UserProfile) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in again to change login status.');
    const idToken = await currentUser.getIdToken();
    const nextActive = !login.isActive;
    const result = await requestSetLoginActive(idToken, { uid: login.uid, isActive: nextActive });
    patchLoginInLists({ ...login, isActive: result.isActive });
  };

  const openAdd = (prefill?: UserLoginPrefill) => {
    setAddPrefill(prefill);
    setShowAdd(true);
  };

  const migrateLegacyStudentEmails = async (admissionNumbers?: string[]) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setPageNotice('Sign in again to update student usernames.');
      return;
    }

    setMigratingEmails(true);
    try {
      const idToken = await currentUser.getIdToken();
      const { updated, failed, results } = await requestMigrateStudentLoginEmails(idToken, {
        admissionNumbers,
      });
      await load();
      if (updated === 0 && failed === 0) {
        setPageNotice('No old-format student usernames found (@student.dgmvdbms.vercel.app).');
      } else if (failed === 0) {
        setPageNotice(`Updated ${updated} student username${updated === 1 ? '' : 's'} to @student.dgmv.`);
      } else {
        const firstError = results.find((r) => !r.success)?.error;
        setPageNotice(
          `Updated ${updated}; ${failed} failed.${firstError ? ` ${firstError}` : ''}`,
        );
      }
    } catch (err: unknown) {
      setPageNotice(err instanceof Error ? err.message : 'Could not update student usernames.');
    } finally {
      setMigratingEmails(false);
    }
  };

  const provisionStudent = async (student: Student, resetExisting = false) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setPageNotice('Sign in again to provision student logins.');
      return;
    }

    setProvisioningAdmission(student.admissionNumber);
    try {
      const idToken = await currentUser.getIdToken();
      const result = await requestProvisionStudentLogin(idToken, {
        admissionNumber: student.admissionNumber,
        resetExisting,
      });
      setShareResult(result);
      await load();
    } catch (err: unknown) {
      setPageNotice(err instanceof Error ? err.message : 'Could not provision student login.');
    } finally {
      setProvisioningAdmission(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      {pageNotice && (
        <div
          role="status"
          className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:px-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p>{pageNotice}</p>
            <button
              type="button"
              onClick={() => setPageNotice('')}
              className="shrink-0 text-xs font-semibold text-amber-800 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label="Staff records"
          value={staffRows.length}
          sub={`${staffWithLogin} with login`}
          icon={UserCheck}
          accent="from-emerald-600 to-emerald-800"
        />
        <StatCard
          label="Need staff login"
          value={staffWithoutLogin}
          sub="In directory, no account"
          icon={KeyRound}
          accent="from-amber-500 to-amber-600"
        />
        <StatCard
          label="Students"
          value={studentRows.length}
          sub={`${studentsWithLogin} with login`}
          icon={GraduationCap}
          accent="from-blue-600 to-blue-800"
        />
        <StatCard
          label="Parent logins"
          value={parentLogins}
          sub="Linked to admission no."
          icon={Users}
          accent="from-violet-500 to-violet-700"
        />
      </div>

      <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search staff or students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 border-slate-200 bg-slate-50/50 pl-9 sm:h-10"
            />
          </div>
          <Button
            className="min-h-[44px] gap-1.5 bg-indigo-700 hover:bg-indigo-800 sm:min-h-10"
            onClick={() => openAdd()}
          >
            <Plus className="h-4 w-4" />
            Create login
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:inline-flex">
          <TabsTrigger value="staff" className="gap-1.5 text-xs sm:text-sm">
            <UserCheck className="h-4 w-4" />
            Staff ({staffRows.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 text-xs sm:text-sm">
            <GraduationCap className="h-4 w-4" />
            Students ({studentRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <LoginFilterPills
            value={staffLoginFilter}
            onChange={setStaffLoginFilter}
            withCount={staffWithLogin}
            withoutCount={staffWithoutLogin}
          />
          <div className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:min-h-[360px] lg:overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
              <p className="text-sm font-bold text-slate-900">
                Staff directory & logins
                <span className="ml-2 font-normal text-slate-500">
                  {loading ? '…' : `${filteredStaff.length} shown`}
                </span>
              </p>
            </div>
            <div className="flex-1 min-h-0 lg:overflow-y-auto scroll-touch">
              {loading ? (
                <p className="p-12 text-center text-sm text-slate-500">Loading…</p>
              ) : filteredStaff.length === 0 ? (
                <p className="p-12 text-center text-sm text-slate-500">No staff match your filters.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredStaff.map(({ staff, login }, i) => (
                    <StaffLoginRow
                      key={staff.id}
                      row={{ staff, login }}
                      index={i}
                      currentUid={userProfile?.uid}
                      onToggle={toggleActive}
                      onCreateLogin={() => openAdd(staffLoginPrefill(staff))}
                      onEditLogin={() => setEditUser(login!)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Staff records live in <strong>Staff</strong>; portal logins in{' '}
            <code className="rounded bg-slate-100 px-1">staff_users</code>, linked by{' '}
            <code className="rounded bg-slate-100 px-1">staffId</code>.
          </p>
        </TabsContent>

        <TabsContent value="students" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <LoginFilterPills
              value={studentLoginFilter}
              onChange={setStudentLoginFilter}
              withCount={studentsWithLogin}
              withoutCount={studentsWithoutLogin}
              extraOptions={[
                { key: 'temp', label: 'Temp', count: studentsWithTempPassword },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {legacyStudentLoginCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 border-amber-200 text-amber-900 hover:bg-amber-50"
                  disabled={migratingEmails}
                  onClick={() => void migrateLegacyStudentEmails()}
                >
                  <Pencil className="h-4 w-4" />
                  {migratingEmails
                    ? 'Updating…'
                    : `Fix usernames (${legacyStudentLoginCount})`}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 border-green-200 text-green-800 hover:bg-green-50"
                onClick={() => setShowBulkProvision(true)}
              >
                <MessageCircle className="h-4 w-4" />
                Provision &amp; share (no login)
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={studentGradeFilter} onValueChange={setStudentGradeFilter}>
              <SelectTrigger className="h-10 w-full border-slate-200 bg-slate-50/80 text-sm sm:w-40">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>All grades</SelectItem>
                {studentGradeOptions.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={studentClassFilter}
              onValueChange={setStudentClassFilter}
              disabled={studentClassOptions.length === 0}
            >
              <SelectTrigger className="h-10 w-full border-slate-200 bg-slate-50/80 text-sm sm:w-44">
                <SelectValue placeholder={isAdvancedLevelGrade(studentGradeFilter) ? 'Stream' : 'Class'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>
                  {studentGradeFilter !== FILTER_ALL && isAdvancedLevelGrade(studentGradeFilter)
                    ? 'All streams'
                    : 'All classes'}
                </SelectItem>
                {studentClassOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasStudentDirectoryFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 text-xs text-blue-700"
                onClick={() => {
                  setStudentGradeFilter(FILTER_ALL);
                  setStudentClassFilter(FILTER_ALL);
                }}
              >
                Clear grade &amp; class
              </Button>
            )}
          </div>
          <div className="flex min-h-[280px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:min-h-[360px] lg:overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
              <p className="text-sm font-bold text-slate-900">
                Student directory & logins
                <span className="ml-2 font-normal text-slate-500">
                  {loading ? '…' : `${filteredStudents.length} shown`}
                </span>
              </p>
            </div>
            <div className="flex-1 min-h-0 lg:overflow-y-auto scroll-touch">
              {loading ? (
                <p className="p-12 text-center text-sm text-slate-500">Loading…</p>
              ) : filteredStudents.length === 0 ? (
                <p className="p-12 text-center text-sm text-slate-500">No students match your filters.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredStudents.map((row, i) => (
                    <StudentLoginRow
                      key={row.student.id}
                      row={row}
                      index={i}
                      currentUid={userProfile?.uid}
                      onToggle={toggleActive}
                      onCreateStudentLogin={() =>
                        openAdd(studentLoginPrefill(row.student))
                      }
                      onCreateParentLogin={() =>
                        openAdd(parentLoginPrefill(row.student))
                      }
                      onEditLogin={setEditUser}
                      onProvisionStudentLogin={(reset) => provisionStudent(row.student, reset)}
                      onMigrateUsername={
                        row.studentLogin && isLegacySyntheticStudentEmail(row.studentLogin.email)
                          ? () => void migrateLegacyStudentEmails([row.student.admissionNumber])
                          : undefined
                      }
                      migratingUsername={migratingEmails}
                      provisioning={provisioningAdmission === row.student.admissionNumber}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Student records in <strong>Students</strong>; logins in{' '}
            <code className="rounded bg-slate-100 px-1">student_users</code> /{' '}
            <code className="rounded bg-slate-100 px-1">parents</code>, linked by admission number.
          </p>
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 pb-[max(0.75rem,var(--safe-bottom))] text-sm text-indigo-900">
        <p className="flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4" />
          How linking works
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-indigo-800/90">
          <li>Add staff and students in their modules first, then create logins here.</li>
          <li>Staff login uses the same ID as the staff record (<span className="font-mono">staffId</span>).</li>
          <li>Student and parent logins use the student&apos;s admission number.</li>
          <li>
            Use <strong>Send login</strong> to create a temporary password and share it on the student&apos;s WhatsApp.
            Students must set their own password at first sign-in. Usernames use{' '}
            <span className="font-mono">admission@student.dgmv</span> unless the student has a personal email.
          </li>
          <li>
            <strong>Fix usernames</strong> updates old{' '}
            <span className="font-mono">@student.dgmvdbms.vercel.app</span> addresses to{' '}
            <span className="font-mono">@student.dgmv</span> without changing passwords.
          </li>
          <li>
            Enable <strong>Quick PIN</strong> when creating a login manually (default: last 4 digits of phone).
          </li>
        </ul>
      </div>

      {showAdd && (
        <AddUserDialog
          prefill={addPrefill}
          defaultAccountType={tab === 'staff' ? 'staff' : 'student'}
          onClose={() => {
            setShowAdd(false);
            setAddPrefill(undefined);
          }}
          onAdded={(_user, meta) => {
            setShowAdd(false);
            setAddPrefill(undefined);
            if (meta?.quickPinWarning) {
              setPageNotice(quickPinSkippedNotice());
            }
            void load();
          }}
        />
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={(_user, meta) => {
            setEditUser(null);
            if (meta?.quickPinWarning) {
              setPageNotice(quickPinSkippedNotice());
            }
            void load();
          }}
        />
      )}

      {shareResult && (
        <StudentCredentialShareDialog
          result={shareResult}
          onClose={() => setShareResult(null)}
        />
      )}

      <StudentBulkProvisionDialog
        open={showBulkProvision}
        onClose={() => setShowBulkProvision(false)}
        onComplete={() => void load()}
      />
    </div>
  );
}

function StaffLoginRow({
  row: { staff, login },
  index,
  currentUid,
  onToggle,
  onCreateLogin,
  onEditLogin,
}: {
  row: StaffWithLogin;
  index: number;
  currentUid?: string;
  onToggle: (login: UserProfile) => void;
  onCreateLogin: () => void;
  onEditLogin: () => void;
}) {
  const roleBadge =
    login?.staffRole && getStaffRoleBadgeColor(login.staffRole);

  return (
    <motion.li
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      className="px-3 py-3 sm:px-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StaffAvatar name={staff.name} profileImageUrl={staff.profileImageUrl} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900">{staff.name}</p>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {staff.status}
              </Badge>
            </div>
            <p className="font-mono text-[11px] font-semibold text-emerald-700">{staff.staffId}</p>
            <p className="text-[11px] text-slate-500">{staff.designation}</p>
            {login ? (
              <p className="mt-1 truncate text-[11px] text-slate-600">
                Login: {login.email}
                {login.quickPinEnabled && (
                  <span className="ml-1.5 inline rounded border border-violet-200 bg-violet-50 px-1 py-0.5 text-[9px] font-bold text-violet-800">
                    PIN
                  </span>
                )}
                {login.staffRole && roleBadge && (
                  <span
                    className={cn(
                      'ml-1.5 inline rounded border px-1 py-0.5 text-[9px] font-bold',
                      roleBadge,
                    )}
                  >
                    {getStaffRoleLabel(login.staffRole)}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-[11px] font-medium text-amber-700">No portal login</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
          <Button variant="ghost" size="sm" className="h-9 gap-1" asChild>
            <Link href={`/dashboard/staff/${staff.id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Record
            </Link>
          </Button>
          {login ? (
            <>
              <Button variant="outline" size="sm" className="h-9 gap-1" onClick={onEditLogin}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <button
                type="button"
                onClick={() => onToggle(login)}
                className={cn(
                  'touch-target-icon flex items-center justify-center rounded-lg px-2',
                  login.isActive ? 'text-green-600' : 'text-slate-400',
                )}
                title={login.isActive ? 'Deactivate login' : 'Activate login'}
              >
                {login.isActive ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
              {login.uid !== currentUid && login.isActive && (
                <DeactivateButton name={login.displayName} onConfirm={() => onToggle(login)} />
              )}
            </>
          ) : (
            <Button
              size="sm"
              className="h-9 bg-emerald-700 hover:bg-emerald-800"
              onClick={onCreateLogin}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Create login
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function StudentLoginRow({
  row: { student, studentLogin, parentLogin },
  index,
  currentUid,
  onToggle,
  onCreateStudentLogin,
  onCreateParentLogin,
  onEditLogin,
  onProvisionStudentLogin,
  onMigrateUsername,
  migratingUsername,
  provisioning,
}: {
  row: StudentWithLogins;
  index: number;
  currentUid?: string;
  onToggle: (login: UserProfile) => void;
  onCreateStudentLogin: () => void;
  onCreateParentLogin: () => void;
  onEditLogin: (login: UserProfile) => void;
  onProvisionStudentLogin: (resetExisting: boolean) => void;
  onMigrateUsername?: () => void;
  migratingUsername?: boolean;
  provisioning?: boolean;
}) {
  return (
    <motion.li
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      className="px-3 py-3 sm:px-4"
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <StudentProfilePhoto
            name={student.name}
            profileImageUrl={student.profileImageUrl}
            size="md"
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
            <p className="font-mono text-[11px] font-semibold text-blue-700">
              {student.admissionNumber}
            </p>
            <p className="text-[11px] text-slate-500">
              {student.grade}
              {student.section ? ` · ${student.section}` : ''} · {student.parentName}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-1" asChild>
            <Link href={`/dashboard/students/${student.id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Record
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <LoginSlot
            label="Student login"
            login={studentLogin}
            emptyLabel="No student login"
            currentUid={currentUid}
            onToggle={onToggle}
            onCreate={onCreateStudentLogin}
            onEdit={() => onEditLogin(studentLogin!)}
            onProvision={() => onProvisionStudentLogin(false)}
            onResetTempPassword={() => onProvisionStudentLogin(true)}
            onMigrateUsername={onMigrateUsername}
            migratingUsername={migratingUsername}
            provisioning={provisioning}
            accent="blue"
          />
          <LoginSlot
            label="Parent login"
            login={parentLogin}
            emptyLabel="No parent login"
            currentUid={currentUid}
            onToggle={onToggle}
            onCreate={onCreateParentLogin}
            onEdit={() => onEditLogin(parentLogin!)}
            accent="violet"
          />
        </div>
      </div>
    </motion.li>
  );
}

function LoginSlot({
  label,
  login,
  emptyLabel,
  currentUid,
  onToggle,
  onCreate,
  onEdit,
  onProvision,
  onResetTempPassword,
  onMigrateUsername,
  migratingUsername,
  provisioning,
  accent,
}: {
  label: string;
  login: UserProfile | null;
  emptyLabel: string;
  currentUid?: string;
  onToggle: (login: UserProfile) => void;
  onCreate: () => void;
  onEdit: () => void;
  onProvision?: () => void;
  onResetTempPassword?: () => void;
  onMigrateUsername?: () => void;
  migratingUsername?: boolean;
  provisioning?: boolean;
  accent: 'blue' | 'violet';
}) {
  const border =
    accent === 'blue' ? 'border-blue-100 bg-blue-50/40' : 'border-violet-100 bg-violet-50/40';
  return (
    <div className={cn('rounded-xl border px-3 py-2.5', border)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {login ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-800">
              {login.email}
              {login.quickPinEnabled && (
                <span className="ml-1 inline rounded border border-violet-200 bg-violet-50 px-1 text-[9px] font-bold text-violet-800">
                  PIN
                </span>
              )}
              {login.mustChangePassword && (
                <span className="ml-1 inline rounded border border-amber-200 bg-amber-50 px-1 text-[9px] font-bold text-amber-800">
                  Temp
                </span>
              )}
              {isLegacySyntheticStudentEmail(login.email) && (
                <span className="ml-1 inline rounded border border-orange-200 bg-orange-50 px-1 text-[9px] font-bold text-orange-800">
                  Old format
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500">
              {login.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onMigrateUsername && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-amber-800"
                disabled={migratingUsername || provisioning}
                onClick={onMigrateUsername}
                title="Change username to @student.dgmv"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onResetTempPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-green-700"
                disabled={provisioning || migratingUsername}
                onClick={onResetTempPassword}
                title="Issue new temporary password and share on WhatsApp"
              >
                <KeySquare className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              onClick={() => onToggle(login)}
              className={login.isActive ? 'text-green-600' : 'text-slate-400'}
            >
              {login.isActive ? (
                <ToggleRight className="h-5 w-5" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </button>
            {login.uid !== currentUid && login.isActive && (
              <DeactivateButton name={login.displayName} onConfirm={() => onToggle(login)} />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-amber-700">{emptyLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {onProvision && (
              <Button
                type="button"
                size="sm"
                className="h-8 bg-green-700 text-xs hover:bg-green-800"
                disabled={provisioning}
                onClick={onProvision}
              >
                <MessageCircle className="h-3 w-3" />
                {provisioning ? 'Sending…' : 'Send login'}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onCreate}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeactivateButton({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600">
          Off
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate login</AlertDialogTitle>
          <AlertDialogDescription>
            Deactivate login for <strong>{name}</strong>? They will not be able to sign in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700">
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
