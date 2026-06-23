/**
 * Device-level privacy lock for installed PWA/TWA (Face ID, Touch ID, fingerprint).
 * Credentials are verified in the browser; challenges are not validated on the server.
 */
import {
  getBiometricUnlockLabel,
  isAppleMobileDevice,
  isStandaloneInstalledApp,
  shouldOfferInstalledAppFeatures,
} from './installed-app';

const STORAGE_PREFIX = 'dgc-biometric-credential';
const ENABLED_SUFFIX = ':enabled';
const SESSION_UNLOCKED = 'dgc-biometric-session-unlocked';

function credentialKey(uid: string): string {
  return `${STORAGE_PREFIX}:${uid}`;
}

function enabledKey(uid: string): string {
  return `${credentialKey(uid)}${ENABLED_SUFFIX}`;
}

function uidToBuffer(uid: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(uid.slice(0, 64)) as Uint8Array<ArrayBuffer>;
}

function randomChallenge(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf as Uint8Array<ArrayBuffer>;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function hasWebAuthnCapability(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext && typeof window.PublicKeyCredential !== 'undefined';
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!hasWebAuthnCapability()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function isInstalledHandheldApp(): boolean {
  return shouldOfferInstalledAppFeatures();
}

/**
 * Installed mobile/tablet PWA with platform biometrics.
 * iOS often reports the probe as false in home-screen WebKit even when Face ID works.
 */
export async function isBiometricUnlockSupported(): Promise<boolean> {
  if (!hasWebAuthnCapability() || !isInstalledHandheldApp()) return false;

  if (await isPlatformAuthenticatorAvailable()) return true;

  if (isAppleMobileDevice() && isStandaloneInstalledApp()) return true;

  return false;
}

export function isBiometricUnlockEnabled(uid: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(enabledKey(uid)) === '1';
}

export function markBiometricSessionUnlocked(): void {
  sessionStorage.setItem(SESSION_UNLOCKED, '1');
}

export function clearBiometricSessionUnlocked(): void {
  sessionStorage.removeItem(SESSION_UNLOCKED);
}

export function isBiometricSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_UNLOCKED) === '1';
}

export function shouldLockAppWithBiometric(uid: string): boolean {
  return isBiometricUnlockEnabled(uid) && !isBiometricSessionUnlocked();
}

export async function registerBiometricUnlock(
  uid: string,
  userName: string,
  displayName: string,
): Promise<void> {
  if (!(await isBiometricUnlockSupported())) {
    throw new Error(
      `${getBiometricUnlockLabel()} is not available on this device. Install the app to your home screen and try again.`,
    );
  }

  const rpId = window.location.hostname;
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: { name: 'Delta DBMS', id: rpId },
    user: {
      id: uidToBuffer(uid),
      name: userName,
      displayName: displayName || userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'discouraged',
    },
    timeout: 60_000,
    attestation: 'none',
  };

  let credential: PublicKeyCredential | null = null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;
  } catch (firstErr) {
    if (!isAppleMobileDevice()) throw firstErr;
    credential = (await navigator.credentials.create({
      publicKey: {
        ...publicKeyOptions,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
      },
    })) as PublicKeyCredential | null;
  }

  if (!credential) {
    throw new Error('Biometric setup was cancelled.');
  }

  localStorage.setItem(credentialKey(uid), bufferToBase64url(credential.rawId));
  localStorage.setItem(enabledKey(uid), '1');
  markBiometricSessionUnlocked();
}

export async function verifyBiometricUnlock(uid: string): Promise<void> {
  const storedId = localStorage.getItem(credentialKey(uid));
  if (!storedId) {
    throw new Error('Biometric unlock is not set up. Enable it in Settings → Security.');
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: 'public-key',
          id: base64urlToBuffer(storedId),
        },
      ],
      userVerification: 'required',
      timeout: 60_000,
    },
  });

  if (!assertion) {
    throw new Error('Unlock was cancelled.');
  }

  markBiometricSessionUnlocked();
}

export function disableBiometricUnlock(uid: string): void {
  localStorage.removeItem(credentialKey(uid));
  localStorage.removeItem(enabledKey(uid));
  clearBiometricSessionUnlocked();
}

export { getBiometricUnlockLabel };
