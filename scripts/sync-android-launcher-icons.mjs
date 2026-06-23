/**
 * Copies generated PWA icons into the Android TWA res/mipmap folders
 * (so the APK uses the school logo, not stale icons from a remote URL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const icon512 = path.join(root, 'public', 'icons', 'icon-512.png');
const maskable512 = path.join(root, 'public', 'icons', 'icon-maskable-512.png');
const resRoot = path.join(root, 'twa', 'app', 'src', 'main', 'res');

const DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function main() {
  const sharp = (await import('sharp')).default;

  if (!fs.existsSync(icon512)) {
    console.error('Run npm run generate-pwa-icons first.');
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(DENSITIES)) {
    const dir = path.join(resRoot, folder);
    if (!fs.existsSync(dir)) {
      console.warn(`Skip missing ${folder}`);
      continue;
    }

    const launcher = path.join(dir, 'ic_launcher.png');
    const maskable = path.join(dir, 'ic_maskable.png');

    await sharp(icon512).resize(size, size).png().toFile(launcher);
    await sharp(maskable512).resize(size, size).png().toFile(maskable);
    console.log(`Updated ${folder} (${size}px)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
