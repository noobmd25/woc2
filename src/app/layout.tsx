import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import Footer from '@/components/Footer';
import Providers from './providers';
import SupabaseProvider from '@/components/supabase-provider'; // unchanged path confirmation
import '@/lib/disableConsole'; // silence console in production
import PullToRefresh from '@/components/PullToRefresh'; // added

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who's On Call",   // 👈 put your app/site name here
  description: "Hospital On-call scheduling made simple.", // 👈 short tagline/description
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Who's On Call"
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "url": "https://whosoncall.app",   // 👈 your real domain
      "logo": "https://whosoncall.app/logo.svg" // 👈 must point to logo in /public
    }),
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#001f3f' }
  ],
};

export const runtime = 'nodejs';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${robotoMono.variable} antialiased`}
        >
        <SupabaseProvider>
          <Providers>
            <PullToRefresh>
              {children}
              <Footer />
            </PullToRefresh>
          </Providers>
        </SupabaseProvider>
      </body>
    </html>
  );
}
