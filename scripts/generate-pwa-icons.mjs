import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const tmpDir = '/tmp';

// 1. Définition du SVG simplifié haute lisibilité pour Favicons (16x16, 32x32, 48x48)
const faviconSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0C2B1E"/>
  <!-- Feuille gauche vert citron vif -->
  <path d="M16 25V13C16 8 10.5 6 7 6C7 11.5 9.5 17 16 18.5" fill="#C8EF56"/>
  <!-- Feuille droite vert émeraude clair -->
  <path d="M16 17C20.5 17 25 12.5 25 8C19.5 8 16.5 11 16 17Z" fill="#34D399"/>
  <!-- Tige centrale blanche ultra nette -->
  <path d="M16 26V13" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Bourgeon supérieur -->
  <circle cx="16" cy="7" r="2.4" fill="#C8EF56"/>
</svg>`;

// 2. Définition du SVG pour l'icône Maskable Android (Safe Zone 80%, fond plein sans transparence)
const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Fond vert émeraude plein 100% (obligatoire pour maskable Android) -->
  <rect width="512" height="512" fill="#0C2B1E"/>
  <!-- Halo décoratif subtil intérieur -->
  <circle cx="256" cy="256" r="165" stroke="#1E6B47" stroke-width="8" stroke-dasharray="16 16" fill="none"/>
  <!-- Emblème officiel dimensionné pour tenir dans le cercle de sécurité de 80% (diamètre max 400px) -->
  <g transform="translate(256, 256) scale(8.2) translate(-22, -22)">
    <path d="M22 32V20C22 14 16 12 12 12C12 18 15 24 22 25" fill="#C8EF56"/>
    <path d="M22 24C27 24 32 19 32 14C26 14 22.5 17 22 24Z" fill="#34D399"/>
    <path d="M22 33V20" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="22" cy="12" r="2.5" fill="#C8EF56"/>
  </g>
</svg>`;

// 3. Définition du SVG pour Apple Touch Icon (180x180, fond plein)
const appleTouchSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <!-- Fond plein sans coins arrondis transparents (iOS applique son propre masque squircle) -->
  <rect width="180" height="180" fill="#0C2B1E"/>
  <circle cx="90" cy="90" r="62" stroke="#1E6B47" stroke-width="4" stroke-dasharray="7 7" fill="none"/>
  <g transform="translate(90, 90) scale(3.2) translate(-22, -22)">
    <path d="M22 32V20C22 14 16 12 12 12C12 18 15 24 22 25" fill="#C8EF56"/>
    <path d="M22 24C27 24 32 19 32 14C26 14 22.5 17 22 24Z" fill="#34D399"/>
    <path d="M22 33V20" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="22" cy="12" r="2.5" fill="#C8EF56"/>
  </g>
</svg>`;

console.log('--- GÉNÉRATION DES ASSETS FAVICON & PWA AGRIMPACT ---');

// Sauvegarder les fichiers temporaires SVG
const tmpFaviconSvg = path.join(tmpDir, 'agri-favicon.svg');
const tmpMaskableSvg = path.join(tmpDir, 'agri-maskable.svg');
const tmpAppleSvg = path.join(tmpDir, 'agri-apple.svg');
const officialSvgPath = path.resolve('public/logos/agrimpact-logo.svg');

fs.writeFileSync(tmpFaviconSvg, faviconSvgContent);
fs.writeFileSync(tmpMaskableSvg, maskableSvgContent);
fs.writeFileSync(tmpAppleSvg, appleTouchSvgContent);

// A. Rendu haute résolution via qlmanage
console.log('1. Rendu vectoriel vers PNG haute résolution...');
execSync(`qlmanage -t -s 1024 -o ${tmpDir} "${tmpFaviconSvg}"`);
execSync(`qlmanage -t -s 1024 -o ${tmpDir} "${tmpMaskableSvg}"`);
execSync(`qlmanage -t -s 1024 -o ${tmpDir} "${tmpAppleSvg}"`);
execSync(`qlmanage -t -s 1024 -o ${tmpDir} "${officialSvgPath}"`);

const baseFaviconPng = path.join(tmpDir, 'agri-favicon.svg.png');
const baseMaskablePng = path.join(tmpDir, 'agri-maskable.svg.png');
const baseApplePng = path.join(tmpDir, 'agri-apple.svg.png');
const baseOfficialPng = path.join(tmpDir, 'agrimpact-logo.svg.png');

console.log('2. Génération des variantes PNG...');

// Favicon PNG 16x16 et 32x32 (optimisé lisibilité)
execSync(`sips -z 16 16 "${baseFaviconPng}" --out "public/favicon-16x16.png"`);
execSync(`sips -z 32 32 "${baseFaviconPng}" --out "public/favicon-32x32.png"`);
const tmpFavicon48 = path.join(tmpDir, 'favicon-48x48.png');
execSync(`sips -z 48 48 "${baseFaviconPng}" --out "${tmpFavicon48}"`);

// Apple Touch Icon 180x180
execSync(`sips -z 180 180 "${baseApplePng}" --out "public/apple-touch-icon.png"`);
execSync(`sips -z 180 180 "${baseApplePng}" --out "app/apple-icon.png"`);

// PWA Icons standards (192x192, 512x512)
execSync(`sips -z 192 192 "${baseOfficialPng}" --out "public/icon-192.png"`);
execSync(`sips -z 512 512 "${baseOfficialPng}" --out "public/icon-512.png"`);
execSync(`sips -z 512 512 "${baseOfficialPng}" --out "public/icon.png"`);
execSync(`sips -z 512 512 "${baseOfficialPng}" --out "app/icon.png"`);

// PWA Icon maskable pour Android (512x512 sans découpage)
execSync(`sips -z 512 512 "${baseMaskablePng}" --out "public/icon-maskable-512.png"`);
execSync(`sips -z 512 512 "${baseMaskablePng}" --out "public/icon-512-maskable.png"`);

// Copie du favicon.svg direct
fs.writeFileSync('public/favicon.svg', faviconSvgContent);

console.log('3. Compilation du fichier binaire multi-résolution favicon.ico (16x16, 32x32, 48x48)...');
const png16 = fs.readFileSync('public/favicon-16x16.png');
const png32 = fs.readFileSync('public/favicon-32x32.png');
const png48 = fs.readFileSync(tmpFavicon48);

const images = [
  { size: 16, buffer: png16 },
  { size: 32, buffer: png32 },
  { size: 48, buffer: png48 },
];

const numImages = images.length;
const headerSize = 6;
const dirEntrySize = 16;
const dirTotalSize = headerSize + (dirEntrySize * numImages);

const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);          // Reserved (0)
header.writeUInt16LE(1, 2);          // Type 1 = ICO
header.writeUInt16LE(numImages, 4);  // Nombre d'images = 3

let currentOffset = dirTotalSize;
const entries = [];
const imageBuffers = [];

for (const img of images) {
  const entry = Buffer.alloc(dirEntrySize);
  entry.writeUInt8(img.size, 0);               // Largeur
  entry.writeUInt8(img.size, 1);               // Hauteur
  entry.writeUInt8(0, 2);                      // Palette de couleurs
  entry.writeUInt8(0, 3);                      // Réservé
  entry.writeUInt16LE(1, 4);                   // Color planes
  entry.writeUInt16LE(32, 6);                  // Bits per pixel (32-bit RGBA)
  entry.writeUInt32LE(img.buffer.length, 8);   // Taille des données en octets
  entry.writeUInt32LE(currentOffset, 12);       // Décalage (offset)

  entries.push(entry);
  imageBuffers.push(img.buffer);
  currentOffset += img.buffer.length;
}

const finalIcoBuffer = Buffer.concat([header, ...entries, ...imageBuffers]);
fs.writeFileSync('public/favicon.ico', finalIcoBuffer);
fs.writeFileSync('app/favicon.ico', finalIcoBuffer);

console.log(`✓ favicon.ico multi-résolution généré avec succès (${finalIcoBuffer.length} octets, 3 résolutions : 16, 32, 48px).`);
console.log('✓ Tous les assets PWA et Favicon sont à jour dans public/ :');
console.log('   - public/favicon.ico (multi-résolution 16/32/48)');
console.log('   - public/favicon.svg (SVG ultra-net)');
console.log('   - public/favicon-16x16.png');
console.log('   - public/favicon-32x32.png');
console.log('   - public/apple-touch-icon.png (180x180 plein)');
console.log('   - public/icon-192.png (192x192)');
console.log('   - public/icon-512.png (512x512 standard)');
console.log('   - public/icon-maskable-512.png (512x512 avec safe-zone 80%)');
