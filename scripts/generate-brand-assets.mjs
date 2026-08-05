import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDirectory = path.resolve('public/icons');

function iconSvg(size, maskable = false) {
  const inset = maskable ? size * 0.16 : size * 0.08;
  const inner = size - inset * 2;
  const radius = maskable ? size * 0.18 : size * 0.24;
  const stroke = size * 0.095;
  const start = size * 0.31;
  const end = size * 0.69;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="rgb(125, 78, 255)"/><stop offset="1" stop-color="rgb(54, 211, 230)"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${maskable ? 0 : radius}" fill="rgb(10, 10, 15)"/>
    <rect x="${inset}" y="${inset}" width="${inner}" height="${inner}" rx="${radius}" fill="url(#a)"/>
    <path d="M ${start} ${end} V ${start} L ${end} ${end} V ${start}" fill="none" stroke="rgb(255, 255, 255)" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`);
}

await mkdir(outputDirectory, {recursive: true});

await Promise.all([
  sharp(iconSvg(16)).png().toFile(path.join('public', 'favicon-16.png')),
  sharp(iconSvg(32)).png().toFile(path.join('public', 'favicon-32.png')),
  sharp(iconSvg(180)).png().toFile(path.join('public', 'apple-touch-icon.png')),
  sharp(iconSvg(192)).png().toFile(path.join(outputDirectory, 'icon-192.png')),
  sharp(iconSvg(512)).png().toFile(path.join(outputDirectory, 'icon-512.png')),
  sharp(iconSvg(512, true)).png().toFile(path.join(outputDirectory, 'maskable-512.png'))
]);

console.log('Generated Nexora PNG favicon and app icon set.');
