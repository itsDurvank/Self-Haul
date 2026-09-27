import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Self-Haul — A Private Ritual',
  description: 'You already know the questions. Put them down. A private ritual to dump pressing questions into the void and answer them yourself.',
  keywords: ['reflection', 'journal', 'mindfulness', 'self-inquiry', 'pwa', 'privacy-first'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Self-Haul',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Self-Haul — A Private Ritual',
    description: 'You already know the questions. Put them down.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#030306',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "h-full", cormorant.variable, "font-sans", geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#030306" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full bg-[#030306] text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
