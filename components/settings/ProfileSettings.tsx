'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  AlertCircle, Check, Mail, User, Phone, Link2, Shield, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { updateOwnProfile } from '@/lib/account-settings';
import { getRoleLabel, getStaffRoleLabel, cn } from '@/lib/utils';
import { isAdmin } from '@/lib/access-control';
import { LinkedSchoolRecordCard } from '@/components/profile/LinkedSchoolRecordCard';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function ReadOnlyField({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200">
        <Icon className="h-4 w-4 text-slate-500" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn('mt-0.5 truncate text-sm font-medium text-slate-900', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

export function ProfileSettings() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      displayName: userProfile?.displayName ?? '',
      phone: userProfile?.phone ?? '',
    },
  });

  if (!userProfile || !user) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        No profile loaded. Contact the school to link your account.
      </div>
    );
  }

  const roleLabel =
    userProfile.accountType === 'staff' && userProfile.staffRole
      ? getStaffRoleLabel(userProfile.staffRole)
      : getRoleLabel(userProfile.role);

  const initials =
    userProfile.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await updateOwnProfile(user.uid, userProfile.accountType, {
        displayName: data.displayName,
        phone: data.phone,
      });
      await refreshProfile();
      setSuccess(true);
      setEditing(false);
    } catch {
      setError('Could not save profile. Check Firestore rules are published.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    reset();
    setEditing(false);
    setError('');
  };

  return (
    <div className="space-y-4">

      {/* Avatar + name strip */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="surface-blue flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-amber-400 shadow-md ring-4 ring-blue-100">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-slate-900">{userProfile.displayName}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-800">
            {roleLabel}
          </span>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Edit profile</h3>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <Check className="h-4 w-4 shrink-0" />
              Profile saved.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="displayName" className="pl-9" {...register('displayName')} />
              </div>
              {errors.displayName && (
                <p className="text-xs text-red-500">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="phone" type="tel" className="pl-9" placeholder="0771234567" {...register('phone')} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="bg-blue-700 hover:bg-blue-800">
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Account details (read-only) */}
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Account details</p>
        <ReadOnlyField icon={Mail} label="Email" value={userProfile.email} />
        <ReadOnlyField icon={Shield} label="Role" value={roleLabel} />
        {userProfile.linkedId && (
          <ReadOnlyField
            icon={Link2}
            label={userProfile.accountType === 'parent' ? 'Child admission no.' : 'Linked ID'}
            value={userProfile.linkedId}
            mono
          />
        )}
        {isAdmin(userProfile) && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
            As an administrator, use User Management to change roles or deactivate accounts.
          </p>
        )}
      </div>

      {/* Linked school record */}
      <LinkedSchoolRecordCard />
    </div>
  );
}
