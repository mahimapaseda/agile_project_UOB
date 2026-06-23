/** True when opened as installed PWA / home-screen app (not a normal browser tab). */
export function isStandaloneInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone, iPad, or iPod. */
export function isAppleMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Phone or tablet (touch-first layouts). */
export function isMobileOrTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 1024px)').matches;
  const mobileUa = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  return (coarse && narrow) || mobileUa;
}

/** Installed home-screen / PWA context on a handheld device. */
export function shouldOfferInstalledAppFeatures(): boolean {
  if (!isStandaloneInstalledApp()) return false;
  if (isAppleMobileDevice()) return true;
  return isMobileOrTabletDevice();
}

/** Safari tab on iPhone/iPad (not home-screen app). */
export function isAppleMobileBrowserTab(): boolean {
  return isAppleMobileDevice() && !isStandaloneInstalledApp();
}

export function getBiometricUnlockLabel(): string {
  if (typeof navigator === 'undefined') return 'Biometric unlock';
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'Face ID or Touch ID';
  return 'Fingerprint or face unlock';
}
