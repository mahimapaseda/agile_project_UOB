import { AccountType } from '@/types';

export async function requestPinLogin(params: {
  linkedId: string;
  pin: string;
  accountType: AccountType;
}): Promise<string> {
  const res = await fetch('/api/auth/pin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { customToken?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'PIN login failed.');
  }
  if (!data.customToken) throw new Error('PIN login failed.');
  return data.customToken;
}

export async function requestSetQuickPin(
  idToken: string,
  params: {
    uid: string;
    linkedId: string;
    accountType: AccountType;
    pin: string;
  },
): Promise<void> {
  const res = await fetch('/api/auth/set-quick-pin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not save PIN.');
  }
}
