import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { Header } from '@/components/Header';
import './globals.css';
import './embed-studio.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Армения · Идеи для постов',
  description: 'Новости и YouTube-тренды для постов в соцсетях',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script id="embed-mode-detect" strategy="beforeInteractive">
          {`(function(){if(/(?:^|[?&])embed=1(?:&|$)/.test(location.search)){document.documentElement.classList.add('embed-mode');document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('embed-mode');});}})();`}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
        suppressHydrationWarning
      >
        <Header />
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="page site-footer__inner caption">
            <span>Армения · Идеи для постов</span>
            <span>Автообновление каждый день в 12:00</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
