// Run with: npm run generate-icons
// Rasterizes src/assets/logo-mark.svg and src/assets/og-image.svg into public/,
// producing every icon size the manifest, favicons, and OG tags reference.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logoSvg = path.join(root, 'src/assets/logo-mark.svg');
const ogSvg = path.join(root, 'src/assets/og-image.svg');
const iconsDir = path.join(root, 'public/icons');
const publicDir = path.join(root, 'public');

fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 }, // same art; safe-zone padding already built into the badge shape
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'favicon-16.png', size: 16 },
];

async function run() {
  for (const { file, size } of sizes) {
    await sharp(logoSvg).resize(size, size).png().toFile(path.join(iconsDir, file));
    console.log('generated', file);
  }
  // apple-touch-icon also needs to live at /public root per Apple's convention
  await sharp(logoSvg).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  await sharp(ogSvg).resize(1200, 630).png().toFile(path.join(publicDir, 'og-image.png'));
  fs.copyFileSync(logoSvg, path.join(publicDir, 'favicon.svg'));

  console.log('\nAll icons generated in /public and /public/icons.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
