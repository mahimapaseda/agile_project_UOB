/**
 * Normalize profile image URLs from Google Forms / Drive for use in <img src>.
 */
export function resolveProfileImageUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();

  if (u.startsWith('data:image/')) return u;

  const fileIdMatch = u.match(/\/file\/d\/([^/]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
  }

  if (u.includes('drive.google.com')) {
    const openId = u.match(/[?&]id=([^&]+)/);
    if (openId) {
      return `https://drive.google.com/uc?export=view&id=${openId[1]}`;
    }
  }

  return u;
}
