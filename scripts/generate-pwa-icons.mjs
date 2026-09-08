import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/logos/agrimpact-logo.svg');
const tmpDir = '/tmp';
const tmpPng = path.join(tmpDir, 'agrimpact-logo.svg.png');

console.log('1. Rendering SVG to base high-res PNG...');
execSync(`qlmanage -t -s 1024 -o ${tmpDir} "${svgPath}"`);

console.log('2. Generating icons with sips...');
// 512x512
execSync(`sips -z 512 512 "${tmpPng}" --out "public/icon-512.png"`);
execSync(`sips -z 512 512 "${tmpPng}" --out "public/icon.png"`);
// 192x192
execSync(`sips -z 192 192 "${tmpPng}" --out "public/icon-192.png"`);
// 180x180 for Apple touch
execSync(`sips -z 180 180 "${tmpPng}" --out "public/apple-touch-icon.png"`);
// 32x32 & 16x16
execSync(`sips -z 32 32 "${tmpPng}" --out "public/favicon-32x32.png"`);
execSync(`sips -z 16 16 "${tmpPng}" --out "public/favicon-16x16.png"`);

// Copy SVG as favicon.svg
fs.copyFileSync(svgPath, 'public/favicon.svg');

console.log('3. Packaging favicon.ico from 32x32 PNG...');
// A valid Windows/Browser ICO can wrap a PNG directly!
const png32 = fs.readFileSync('public/favicon-32x32.png');
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0); // Width
icoEntry.writeUInt8(32, 1); // Height
icoEntry.writeUInt8(0, 2);  // Palette colors
icoEntry.writeUInt8(0, 3);  // Reserved
icoEntry.writeUInt16LE(1, 4); // Color planes
icoEntry.writeUInt16LE(32, 6); // Bits per pixel
icoEntry.writeUInt32LE(png32.length, 8); // Size of image data
icoEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([icoHeader, icoEntry, png32]);
fs.writeFileSync('public/favicon.ico', icoBuffer);

console.log('✓ All PWA and Favicon assets successfully generated in public/ !');
