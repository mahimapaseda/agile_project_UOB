/** True on Android phones/tablets (not desktop Chrome devtools). */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}
