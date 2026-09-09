import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AGRIMPACT — Conseil Agricole & Météo Sénégal',
    short_name: 'AgriImpact',
    description: 'Copilote agronomique décisionnel et météo prédictive pour les producteurs au Sénégal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0C2B1E',
    theme_color: '#0C2B1E',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
