import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AgriProvider } from '../lib/context/AgriContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.agrimpact.app'),
  title: 'AGRIMPACT — Conseil Agricole & Météo Sénégal',
  description: 'Le copilote de votre exploitation agricole au Sénégal. Recommandations agronomiques actionnables et météo en temps réel.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AGRIMPACT — Conseil Agricole & Météo Sénégal',
    description: 'Le copilote de votre exploitation agricole au Sénégal. Recommandations agronomiques actionnables et météo en temps réel.',
    url: 'https://www.agrimpact.app',
    siteName: 'AgriImpact',
    locale: 'fr_SN',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AGRIMPACT',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0C2B1E',
};

import AssistantWidget from '../components/assistant/AssistantWidget';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('agrimpact_theme');
                  var isDark = theme === 'dark' || ((!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col w-full">
        <AgriProvider>
          <div className="app-shell">
            {children}
          </div>
          <AssistantWidget />
        </AgriProvider>
      </body>
    </html>
  );
}
