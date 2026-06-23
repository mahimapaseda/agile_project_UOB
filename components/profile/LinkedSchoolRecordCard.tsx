'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, GraduationCap, UserCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  getLinkedStaffForProfile,
  getLinkedStudentForProfile,
  resolveMyProfilePath,
} from '@/lib/linked-records';
import { canViewFullStaffProfile, isParentAccount, isSchoolStaff, isStudentAccount } from '@/lib/access-control';
import { Staff, Student } from '@/types';
import { getStaffRoleLabel, getRoleLabel } from '@/lib/utils';
import { ContactActionLink } from '@/components/contact/ContactActionLink';

export function LinkedSchoolRecordCard() {
  const { userProfile } = useAuth();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [profilePath, setProfilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [s, st, path] = await Promise.all([
        isSchoolStaff(userProfile) ? getLinkedStaffForProfile(userProfile) : Promise.resolve(null),
        isStudentAccount(userProfile) || isParentAccount(userProfile)
          ? getLinkedStudentForProfile(userProfile)
          : Promise.resolve(null),
        resolveMyProfilePath(userProfile),
      ]);
      if (!cancelled) {
        setStaff(s);
        setStudent(st);
        setProfilePath(path);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  if (!userProfile) return null;

  const title = isSchoolStaff(userProfile)
    ? 'My staff record'
    : isParentAccount(userProfile)
      ? "My child's record"
      : 'My student record';

  const Icon = isSchoolStaff(userProfile) ? UserCheck : GraduationCap;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>
          School directory record linked to your login
          {userProfile.linkedId ? (
            <>
              {' '}
              (<span className="font-mono font-semibold">{userProfile.linkedId}</span>)
            </>
          ) : null}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : !profilePath ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              No school record is linked to your account yet. Ask an administrator to set your{' '}
              {isSchoolStaff(userProfile) ? 'staff ID' : 'admission number'} in User Management.
            </p>
          </div>
        ) : staff ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="font-semibold text-slate-900">{staff.name}</p>
              {staff.nameWithInitials?.trim() && (
                <p className="mt-1 text-sm text-slate-600">{staff.nameWithInitials}</p>
              )}
              {canViewFullStaffProfile(userProfile) ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">
                    {staff.designation}
                    {staff.department ? ` · ${staff.department}` : ''}
                  </p>
                  <p className="mt-1 font-mono text-xs text-emerald-800">{staff.staffId}</p>
                </>
              ) : (
                staff.classAndGrade?.trim() && (
                  <p className="mt-1 text-sm font-medium text-slate-700">{staff.classAndGrade}</p>
                )
              )}
              {(staff.phone || staff.whatsapp || staff.email) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  {staff.phone && <ContactActionLink kind="tel" value={staff.phone} />}
                  {staff.whatsapp && <ContactActionLink kind="whatsapp" value={staff.whatsapp} />}
                  {staff.email && <ContactActionLink kind="mailto" value={staff.email} />}
                </p>
              )}
              {userProfile.staffRole && (
                <p className="mt-2 text-xs text-slate-500">
                  Portal role: {getStaffRoleLabel(userProfile.staffRole)}
                </p>
              )}
            </div>
            <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
              <Link href={profilePath}>
                {canViewFullStaffProfile(userProfile) ? 'View full staff profile' : 'View staff contact'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : student ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="font-semibold text-slate-900">{student.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {student.grade}
                {student.section ? ` · ${student.section}` : ''}
              </p>
              <p className="mt-1 font-mono text-xs text-blue-800">{student.admissionNumber}</p>
              <p className="mt-2 text-xs text-slate-500">
                Portal role: {getRoleLabel(userProfile.role)}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href={profilePath}>
                {isParentAccount(userProfile) ? 'View child profile' : 'View full student profile'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
