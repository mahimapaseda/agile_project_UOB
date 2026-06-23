/**
 * Android TWA splash screens: school logo + welcome / college / DBMS text.
 * Run: node scripts/generate-android-splash.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'public', 'school-logo.png');
const resRoot = path.join(root, 'twa', 'app', 'src', 'main', 'res');
const BG = '#f1f5f9';

const SPLASH_DIRS = {
  'drawable-mdpi': { w: 320, h: 480 },
  'drawable-hdpi': { w: 480, h: 720 },
  'drawable-xhdpi': { w: 720, h: 1080 },
  'drawable-xxhdpi': { w: 960, h: 1440 },
  'drawable-xxxhdpi': { w: 1280, h: 1920 },
};

function buildSplashSvg(width, height) {
  const logoBox = Math.round(Math.min(width, height) * 0.28);
  const logoY = Math.round(height * 0.28);
  const logoX = Math.round((width - logoBox) / 2);
  const line1Y = Math.round(height * 0.62);
  const line2Y = Math.round(height * 0.68);
  const line3Y = Math.round(height * 0.74);
  const fs1 = Math.round(width * 0.038);
  const fs2 = Math.round(width * 0.042);
  const fs3 = Math.round(width * 0.065);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="${logoX - 8}" y="${logoY - 8}" width="${logoBox + 16}" height="${logoBox + 16}" rx="24" fill="#ffffff"/>
  <text x="${width / 2}" y="${line1Y}" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="${fs1}" font-weight="500" fill="#64748b">welcome</text>
  <text x="${width / 2}" y="${line2Y}" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="${fs2}" font-weight="700" fill="#1e293b">Delta gemunupura College</text>
  <text x="${width / 2}" y="${line3Y}" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="${fs3}" font-weight="800" fill="#1e3a8a">DBMS</text>
</svg>`;
}

async function main() {
  const sharp = (await import('sharp')).default;
  if (!fs.existsSync(logoPath)) {
    console.error(`Missing ${logoPath}`);
    process.exit(1);
  }

  for (const [folder, { w, h }] of Object.entries(SPLASH_DIRS)) {
    const dir = path.join(resRoot, folder);
    if (!fs.existsSync(dir)) continue;

    const logoBox = Math.round(Math.min(w, h) * 0.28);
    const logoY = Math.round(h * 0.28);
    const logoX = Math.round((w - logoBox) / 2);

    const base = sharp(Buffer.from(buildSplashSvg(w, h))).png();
    const logo = await sharp(logoPath)
      .resize(logoBox, logoBox, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    const out = path.join(dir, 'splash.png');
    await base
      .composite([{ input: logo, left: logoX, top: logoY }])
      .toFile(out);
    console.log(`Wrote ${folder}/splash.png (${w}x${h})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
