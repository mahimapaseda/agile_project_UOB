'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getStaffList, getStudents } from '@/lib/firestore';
import { requestCreateLogin } from '@/lib/admin-auth-client';
import {
  parentLoginPrefill,
  staffLoginPrefill,
  studentLoginPrefill,
} from '@/lib/user-management';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserProfile, AccountType, StaffRole, Staff, Student } from '@/types';
import { AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { suggestQuickPinFromPhone } from '@/lib/quick-pin';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/access-control';
import {
  formatFirebaseAdminConfigError,
  formatQuickPinPepperConfigError,
  isFirebaseAdminNotConfiguredMessage,
  isQuickPinPepperNotConfiguredMessage,
} from '@/lib/firebase-admin-config-message';

export type UserLoginPrefill = {
  accountType: AccountType;
  displayName?: string;
  email?: string;
  phone?: string;
  linkedId?: string;
  staffRole?: StaffRole;
  /** When set, picker is hidden and record is fixed */
  staff?: Staff;
  student?: Student;
};

interface AddUserDialogProps {
  onClose: () => void;
  onAdded: (user: UserProfile, meta?: { quickPinWarning?: string }) => void;
  defaultAccountType?: AccountType;
  prefill?: UserLoginPrefill;
}

export function AddUserDialog({
  onClose,
  onAdded,
  defaultAccountType = 'staff',
  prefill,
}: AddUserDialogProps) {
  const { userProfile } = useAuth();
  const locked = !!(prefill?.staff || prefill?.student);

  const [displayName, setDisplayName] = useState(prefill?.displayName ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [quickPin, setQuickPin] = useState(() => suggestQuickPinFromPhone(prefill?.phone));
  const [enableQuickPin, setEnableQuickPin] = useState(true);
  const [accountType, setAccountType] = useState<AccountType>(
    prefill?.accountType ?? defaultAccountType,
  );
  const [staffRole, setStaffRole] = useState<StaffRole>(prefill?.staffRole ?? 'teacher');
  const [linkedId, setLinkedId] = useState(prefill?.linkedId ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successNote, setSuccessNote] = useState('');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    prefill?.staff?.id ?? null,
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    prefill?.student?.id ?? null,
  );

  useEffect(() => {
    if (locked) return;
    if (accountType === 'staff') {
      getStaffList(undefined, 'active').then(setStaffList);
    } else if (accountType === 'student' || accountType === 'parent') {
      getStudents(undefined, 'active').then(setStudentList);
    }
  }, [accountType, locked]);

  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (accountType === 'staff') {
      return staffList.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.staffId.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }
    return studentList.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false),
    );
  }, [accountType, staffList, studentList, pickerSearch]);

  const applyStaff = (s: Staff) => {
    const p = staffLoginPrefill(s);
    setSelectedStaffId(s.id);
    setDisplayName(p.displayName);
    setEmail(p.email);
    setPhone(p.phone ?? '');
    setLinkedId(p.linkedId);
    setStaffRole(p.staffRole);
    setQuickPin(suggestQuickPinFromPhone(p.phone));
  };

  const applyStudent = (s: Student, asParent: boolean) => {
    const p = asParent ? parentLoginPrefill(s) : studentLoginPrefill(s);
    setSelectedStudentId(s.id);
    setAccountType(p.accountType);
    setDisplayName(p.displayName);
    setEmail(p.email);
    setPhone(p.phone ?? '');
    setLinkedId(p.linkedId);
    setQuickPin(suggestQuickPinFromPhone(p.phone));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((accountType === 'parent' || accountType === 'student') && !linkedId.trim()) {
      setError('Link the account to a student admission number.');
      return;
    }
    if (accountType === 'staff' && !linkedId.trim()) {
      setError('Staff ID is required — pick a staff member from the directory first.');
      return;
    }
    if (!isAdmin(userProfile)) {
      setError(
        'Only Principal or Technical Officer can create logins.',
      );
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessNote('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('You must be signed in as principal or technical officer.');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const result = await requestCreateLogin(idToken, {
        email,
        password,
        displayName,
        accountType,
        staffRole: accountType === 'staff' ? staffRole : undefined,
        linkedId: linkedId.trim() || undefined,
        phone: phone || undefined,
        enableQuickPin: enableQuickPin && !!linkedId.trim(),
        quickPin: enableQuickPin ? quickPin.trim() : undefined,
      });

      if (result.linkedExistingAuth) {
        setSuccessNote(
          'Linked an existing Firebase account with this email to the staff/student record. Password and profile were updated.',
        );
      } else       if (result.updatedExistingProfile) {
        setSuccessNote('Updated the existing login for this email and linked it to the selected ID.');
      }

      onAdded({ uid: result.uid, ...result.profile } as UserProfile, {
        quickPinWarning: result.quickPinWarning,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (isQuickPinPepperNotConfiguredMessage(msg)) {
        setError(formatQuickPinPepperConfigError());
      } else if (isFirebaseAdminNotConfiguredMessage(msg)) {
        setError(formatFirebaseAdminConfigError(msg));
      } else {
        setError(msg || 'Failed to create login. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const personName = prefill?.staff?.name ?? prefill?.student?.name;
  const titleLabel = prefill?.staff
    ? 'Create login'
    : prefill?.student
      ? accountType === 'parent'
        ? 'Parent login'
        : 'Student login'
      : 'Create portal login';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'flex w-[calc(100vw-0.75rem)] max-w-lg flex-col gap-0 overflow-hidden p-0',
          'max-h-[min(92dvh,900px)]',
          'max-[639px]:top-auto max-[639px]:bottom-0 max-[639px]:translate-y-0 max-[639px]:rounded-b-none max-[639px]:rounded-t-2xl',
        )}
      >
        <DialogHeader className="shrink-0 border-b border-slate-100">
          <DialogTitle className="text-base leading-snug sm:text-lg">{titleLabel}</DialogTitle>
          {personName && (
            <p className="text-sm font-medium text-slate-700 line-clamp-2" title={personName}>
              {personName}
            </p>
          )}
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">
            Linked by staff ID or admission number. Existing Firebase emails are linked automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-touch px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successNote && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {successNote}
              </div>
            )}

            {!locked && (
              <>
                <div className="space-y-1.5">
                  <Label>Account type *</Label>
                  <Select
                    value={accountType}
                    onValueChange={(v) => {
                      const t = v as AccountType;
                      setAccountType(t);
                      setSelectedStaffId(null);
                      setSelectedStudentId(null);
                      setLinkedId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent (linked to student)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {accountType === 'staff' ? 'Pick staff member' : 'Pick student'}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder={
                        accountType === 'staff'
                          ? 'Search name, staff ID, email…'
                          : 'Search name, admission no., email…'
                      }
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {pickerItems.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">
                        No matching records. Add them in Staff or Students first.
                      </p>
                    ) : (
                      pickerItems.slice(0, 50).map((item) => {
                        const isStaff = accountType === 'staff';
                        const id = isStaff ? (item as Staff).id : (item as Student).id;
                        const selected = isStaff
                          ? selectedStaffId === id
                          : selectedStudentId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              isStaff
                                ? applyStaff(item as Staff)
                                : applyStudent(item as Student, accountType === 'parent')
                            }
                            className={cn(
                              'w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50',
                              selected && 'bg-indigo-50 ring-1 ring-inset ring-indigo-200',
                            )}
                          >
                            {isStaff ? (
                              <>
                                <p className="font-semibold text-slate-900">
                                  {(item as Staff).name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {(item as Staff).staffId} · {(item as Staff).designation}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-slate-900">
                                  {(item as Student).name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {(item as Student).admissionNumber} · Grade{' '}
                                  {(item as Student).grade}
                                </p>
                              </>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            {locked && prefill?.staff && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                <span className="font-mono font-semibold">{prefill.staff.staffId}</span>
                <span className="text-emerald-700"> · {prefill.staff.designation}</span>
              </div>
            )}
            {locked && prefill?.student && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900">
                <span className="font-mono font-semibold">{prefill.student.admissionNumber}</span>
                <span className="text-blue-700"> · Grade {prefill.student.grade}</span>
              </div>
            )}

            {accountType === 'staff' && (
              <div className="space-y-1.5">
                <Label>Staff role *</Label>
                <Select value={staffRole} onValueChange={(v) => setStaffRole(v as StaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal (Admin)</SelectItem>
                    <SelectItem value="technical_officer">Technical Officer (Admin)</SelectItem>
                    <SelectItem value="vice_principal">Vice Principal</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="clerk">Clerk / Non-academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Display name *</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPhone(v);
                    if (enableQuickPin) setQuickPin(suggestQuickPinFromPhone(v));
                  }}
                  type="tel"
                  placeholder="0771234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  {accountType === 'staff' ? 'Staff ID *' : 'Admission number *'}
                </Label>
                <Input
                  value={linkedId}
                  onChange={(e) => setLinkedId(e.target.value)}
                  className="font-mono"
                  required
                  readOnly={locked}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Login email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@school.lk"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm password *</Label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={6}
                autoComplete="new-password"
                aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
                className={cn(
                  confirmPassword.length > 0 &&
                    password !== confirmPassword &&
                    'border-red-300 focus-visible:ring-red-500',
                )}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableQuickPin}
                  onChange={(e) => setEnableQuickPin(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-semibold text-violet-950">Enable Quick PIN access</span>
                  <span className="block text-xs text-violet-800/80 mt-0.5">
                    User can sign in with {accountType === 'staff' ? 'Staff ID' : 'admission number'} + PIN on the login page.
                  </span>
                </span>
              </label>
              {enableQuickPin && (
                <div className="space-y-1.5">
                  <Label>Quick PIN (4–6 digits)</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={quickPin}
                    onChange={(e) => {
                      setQuickPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    }}
                    onBlur={() => {
                      if (!quickPin) setQuickPin(suggestQuickPinFromPhone(phone));
                    }}
                    placeholder="Last 4 of phone suggested"
                    maxLength={6}
                    minLength={4}
                    required={enableQuickPin}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-slate-100 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="outline" onClick={onClose} className="min-h-11 w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full bg-indigo-700 hover:bg-indigo-800 sm:w-auto"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating…
                </>
              ) : (
                'Create login'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
