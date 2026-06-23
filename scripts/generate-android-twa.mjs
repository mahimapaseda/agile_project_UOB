/**
 * Generates the Android TWA project from twa/twa-manifest.json (no interactive prompts).
 * Run: node scripts/generate-android-twa.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleLog, TwaGenerator, TwaManifest } from '@bubblewrap/core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const twaDir = path.join(root, 'twa');
const manifestPath = path.join(twaDir, 'twa-manifest.json');
const projectDir = twaDir;

async function main() {
  if (!fs.existsSync(manifestPath)) {
    console.error(`Missing ${manifestPath}`);
    process.exit(1);
  }

  const twaManifest = await TwaManifest.fromFile(manifestPath);
  twaManifest.targetSdkVersion = 35;
  twaManifest.compileSdkVersion = 35;
  twaManifest.minSdkVersion = 23;

  const log = new ConsoleLog();
  const generator = new TwaGenerator();
  await generator.createTwaProject(projectDir, twaManifest, log);
  await twaManifest.saveToFile(manifestPath);

  console.log(`Android TWA project generated in ${projectDir}`);
  console.log('Build APK: cd twa && npx @bubblewrap/cli build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
