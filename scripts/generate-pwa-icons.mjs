/**
 * Generates PWA / Android launcher icons from public/school-logo.png.
 * The emblem fills a white icon (no "DG" text, no blue frame).
 * Run: npm run generate-pwa-icons
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'public', 'school-logo.png');
const outDir = path.join(root, 'public', 'icons');

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function renderIcon(sharp, size, { maskable = false } = {}) {
  if (!fs.existsSync(logoPath)) {
    throw new Error(`Missing ${logoPath} — add the school emblem PNG.`);
  }

  const padding = maskable ? Math.round(size * 0.12) : Math.round(size * 0.06);
  const inner = size - padding * 2;

  const emblem = await sharp(logoPath)
    .resize(inner, inner, {
      fit: 'contain',
      background: WHITE,
    })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: emblem, left: padding, top: padding }])
    .png()
    .toBuffer();
}

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: npm install sharp --save-dev');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const outputs = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-maskable-192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512.png', size: 512, maskable: true },
  ];

  for (const { name, size, maskable } of outputs) {
    const png = await renderIcon(sharp, size, { maskable });
    await fs.promises.writeFile(path.join(outDir, name), png);
    console.log(`Wrote public/icons/${name}`);
  }

  await fs.promises.copyFile(logoPath, path.join(outDir, 'school-logo-source.png'));
  console.log('Copied school-logo.png → public/icons/school-logo-source.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
