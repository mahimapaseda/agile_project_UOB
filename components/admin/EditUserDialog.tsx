'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { requestUpdateLogin } from '@/lib/admin-auth-client';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserProfile, StaffRole } from '@/types';
import { AlertCircle } from 'lucide-react';
import { cn, getStaffRoleLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/access-control';
import {
  formatFirebaseAdminConfigError,
  formatQuickPinPepperConfigError,
  isFirebaseAdminNotConfiguredMessage,
  isQuickPinPepperNotConfiguredMessage,
} from '@/lib/firebase-admin-config-message';

interface EditUserDialogProps {
  user: UserProfile;
  onClose: () => void;
  onUpdated: (user: UserProfile, meta?: { quickPinWarning?: string }) => void;
}

const ACCOUNT_LABELS: Record<UserProfile['accountType'], string> = {
  staff: 'Staff',
  student: 'Student',
  parent: 'Parent',
};

export function EditUserDialog({ user, onClose, onUpdated }: EditUserDialogProps) {
  const { userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>(user.staffRole ?? 'teacher');
  const [enableQuickPin, setEnableQuickPin] = useState(user.quickPinEnabled ?? false);
  const [quickPin, setQuickPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin(userProfile)) {
      setError('Only Principal or Technical Officer can edit logins.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (enableQuickPin && !user.quickPinEnabled && !quickPin.trim()) {
      setError('Enter a Quick PIN to enable PIN login.');
      return;
    }
    if (quickPin.trim() && (quickPin.length < 4 || quickPin.length > 6)) {
      setError('Quick PIN must be 4–6 digits.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('You must be signed in as principal or technical officer.');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const result = await requestUpdateLogin(idToken, {
        uid: user.uid,
        email,
        displayName,
        phone: phone || undefined,
        staffRole: user.accountType === 'staff' ? staffRole : undefined,
        password: password || undefined,
        enableQuickPin,
        quickPin: quickPin.trim() || undefined,
      });

      onUpdated({ uid: result.uid, ...result.profile } as UserProfile, {
        quickPinWarning: result.quickPinWarning,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (isQuickPinPepperNotConfiguredMessage(msg)) {
        setError(formatQuickPinPepperConfigError());
      } else if (isFirebaseAdminNotConfiguredMessage(msg)) {
        setError(formatFirebaseAdminConfigError(msg));
      } else {
        setError(msg || 'Failed to update login. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

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
          <DialogTitle className="text-base leading-snug sm:text-lg">Edit login</DialogTitle>
          <p className="text-sm font-medium text-slate-700 line-clamp-2" title={user.displayName}>
            {user.displayName}
          </p>
          <DialogDescription className="text-xs leading-relaxed sm:text-sm">
            Update credentials and access. Leave password blank to keep the current password.
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

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ACCOUNT_LABELS[user.accountType]}</Badge>
              {user.staffRole && (
                <Badge variant="outline" className="text-[10px]">
                  {getStaffRoleLabel(user.staffRole)}
                </Badge>
              )}
              {user.linkedId && (
                <span className="font-mono text-xs text-slate-600">{user.linkedId}</span>
              )}
            </div>

            {user.accountType === 'staff' && (
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

            <div className="space-y-1.5">
              <Label>Display name *</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="0771234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{user.accountType === 'staff' ? 'Staff ID' : 'Admission number'}</Label>
                <Input value={user.linkedId ?? ''} className="font-mono" readOnly disabled />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Login email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label>New password</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm password</Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Only if changing"
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={confirmPassword.length > 0 && password !== confirmPassword}
                  className={cn(
                    confirmPassword.length > 0 &&
                      password !== confirmPassword &&
                      'border-red-300 focus-visible:ring-red-500',
                  )}
                />
              </div>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}

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
                    {user.quickPinEnabled
                      ? 'Leave PIN blank to keep the current PIN, or enter a new one to reset it.'
                      : 'Enter a PIN below to allow ID + PIN sign-in.'}
                  </span>
                </span>
              </label>
              {enableQuickPin && (
                <div className="space-y-1.5">
                  <Label>{user.quickPinEnabled ? 'New Quick PIN (optional)' : 'Quick PIN (4–6 digits)'}</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={quickPin}
                    onChange={(e) => {
                      setQuickPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    }}
                    placeholder={user.quickPinEnabled ? 'Leave blank to keep current PIN' : '4–6 digits'}
                    maxLength={6}
                    minLength={user.quickPinEnabled ? undefined : 4}
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
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
