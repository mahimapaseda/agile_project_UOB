import { AccountType, StaffRole, UserProfile } from '@/types';

export async function requestCreateLogin(
  idToken: string,
  input: {
    email: string;
    password: string;
    displayName: string;
    accountType: AccountType;
    staffRole?: StaffRole;
    linkedId?: string;
    phone?: string;
    enableQuickPin?: boolean;
    quickPin?: string;
  },
): Promise<{
  uid: string;
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
  linkedExistingAuth?: boolean;
  updatedExistingProfile?: boolean;
  quickPinWarning?: string;
}> {
  const res = await fetch('/api/admin/create-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: {
    uid?: string;
    profile?: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
    linkedExistingAuth?: boolean;
    updatedExistingProfile?: boolean;
    quickPinWarning?: string;
    error?: string;
  };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    if (res.status === 404) {
      throw new Error(
        'Create-login API not found. Restart the dev server (npm run dev) from the school-dbms folder.',
      );
    }
    throw new Error(
      text?.slice(0, 200) ||
        `Server error (${res.status}). Restart npm run dev and check the terminal for errors.`,
    );
  }

  if (!res.ok) {
    throw new Error(data.error || `Failed to create login (${res.status}).`);
  }
  if (!data.uid || !data.profile) {
    throw new Error('Invalid response from server.');
  }

  return {
    uid: data.uid,
    profile: data.profile,
    linkedExistingAuth: data.linkedExistingAuth,
    updatedExistingProfile: data.updatedExistingProfile,
    quickPinWarning: data.quickPinWarning,
  };
}

export async function requestUpdateLogin(
  idToken: string,
  input: {
    uid: string;
    email?: string;
    password?: string;
    displayName?: string;
    phone?: string;
    staffRole?: StaffRole;
    enableQuickPin?: boolean;
    quickPin?: string;
  },
): Promise<{
  uid: string;
  profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
  quickPinWarning?: string;
}> {
  const res = await fetch('/api/admin/update-login', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: {
    uid?: string;
    profile?: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>;
    quickPinWarning?: string;
    error?: string;
  };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    if (res.status === 404) {
      throw new Error(
        'Update-login API not found. Restart the dev server (npm run dev) from the school-dbms folder.',
      );
    }
    throw new Error(
      text?.slice(0, 200) ||
        `Server error (${res.status}). Restart npm run dev and check the terminal for errors.`,
    );
  }

  if (!res.ok) {
    throw new Error(data.error || `Failed to update login (${res.status}).`);
  }
  if (!data.uid || !data.profile) {
    throw new Error('Invalid response from server.');
  }

  return { uid: data.uid, profile: data.profile, quickPinWarning: data.quickPinWarning };
}

export type ProvisionStudentLoginResponse = {
  admissionNumber: string;
  studentName: string;
  studentId: string;
  email: string;
  temporaryPassword: string;
  whatsappPhone: string | null;
  whatsappShareUrl: string | null;
  created: boolean;
  resetPassword: boolean;
};

export type BulkProvisionStudentRow = {
  admissionNumber: string;
  studentName: string;
  success: boolean;
  error?: string;
  email?: string;
  temporaryPassword?: string;
  whatsappPhone?: string | null;
  whatsappShareUrl?: string | null;
  created?: boolean;
  resetPassword?: boolean;
};

export async function requestProvisionStudentLogin(
  idToken: string,
  input: { admissionNumber: string; resetExisting?: boolean },
): Promise<ProvisionStudentLoginResponse> {
  const res = await fetch('/api/admin/provision-student-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as ProvisionStudentLoginResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Failed to provision student login (${res.status}).`);
  }
  return data;
}

export async function requestProvisionStudentLogins(
  idToken: string,
  input?: { admissionNumbers?: string[]; onlyWithoutLogin?: boolean },
): Promise<{ results: BulkProvisionStudentRow[] }> {
  const res = await fetch('/api/admin/provision-student-logins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input ?? { onlyWithoutLogin: true }),
  });

  const data = (await res.json()) as { results?: BulkProvisionStudentRow[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Failed to provision student logins (${res.status}).`);
  }
  if (!data.results) {
    throw new Error('Invalid response from server.');
  }
  return { results: data.results };
}

export type MigrateStudentLoginEmailRow = {
  uid: string;
  admissionNumber: string;
  oldEmail: string;
  newEmail?: string;
  success: boolean;
  error?: string;
};

export async function requestMigrateStudentLoginEmails(
  idToken: string,
  input?: { admissionNumbers?: string[] },
): Promise<{ results: MigrateStudentLoginEmailRow[]; updated: number; failed: number }> {
  const res = await fetch('/api/admin/migrate-student-login-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input ?? {}),
  });

  const data = (await res.json()) as {
    results?: MigrateStudentLoginEmailRow[];
    updated?: number;
    failed?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Failed to migrate student usernames (${res.status}).`);
  }
  if (!data.results) {
    throw new Error('Invalid response from server.');
  }
  return {
    results: data.results,
    updated: data.updated ?? 0,
    failed: data.failed ?? 0,
  };
}

export async function requestCompletePasswordSetup(
  idToken: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch('/api/auth/complete-password-setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Failed to update password (${res.status}).`);
  }
}

export async function requestSetLoginActive(
  idToken: string,
  input: { uid: string; isActive: boolean },
): Promise<{ uid: string; isActive: boolean }> {
  const res = await fetch('/api/admin/set-login-active', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as { uid?: string; isActive?: boolean; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Failed to update login status (${res.status}).`);
  }
  if (!data.uid || typeof data.isActive !== 'boolean') {
    throw new Error('Invalid response from server.');
  }
  return { uid: data.uid, isActive: data.isActive };
}
