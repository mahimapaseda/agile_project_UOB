'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { AlertCircle, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { completeStudentPasswordSetup } from '@/lib/account-settings';
import { mapAuthPasswordError } from '@/lib/account-settings';

const schema = z
  .object({
    newPassword: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function MustChangePasswordScreen() {
  const { userProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSaving(true);
    setError('');
    try {
      const idToken = await currentUser.getIdToken();
      await completeStudentPasswordSetup(idToken, data.newPassword);
      setSaved(true);
      await refreshProfile();
    } catch (err: unknown) {
      setError(mapAuthPasswordError(err));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-7 w-7 text-emerald-700" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Password saved</h1>
          <p className="mt-2 text-sm text-slate-600">Opening your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg">
        <div className="mb-5 flex flex-col items-center text-center">
          <AppWelcomeBranding variant="light" logoSize={64} />
          <h1 className="mt-4 text-lg font-bold text-slate-900">Create your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome{userProfile?.displayName ? `, ${userProfile.displayName}` : ''}. Replace the temporary
            password with one only you know.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                className="pl-9 pr-10"
                autoComplete="new-password"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className="pl-9 pr-10"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={saving}>
            {saving ? 'Saving…' : (
              <>
                <Check className="h-4 w-4" />
                Save and continue
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
