import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AgriProvider } from '../lib/context/AgriContext';

export const metadata: Metadata = {
  title: 'AGRIMPACT — Conseil Agricole & Météo Sénégal',
  description: 'Le copilote de votre exploitation agricole au Sénégal. Recommandations agronomiques actionnables et météo en temps réel.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1b5e20',
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
