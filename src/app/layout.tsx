import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import Footer from '@/components/Footer';
import Providers from './providers';
import SupabaseProvider from '@/components/supabase-provider'; // unchanged path confirmation

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
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "url": "https://whosoncall.app",   // 👈 your real domain
      "logo": "https://whosoncall.app/logo.svg" // 👈 must point to logo in /public
    }),
  },
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
            {children}
            <Footer />
          </Providers>
        </SupabaseProvider>
      </body>
    </html>
  );
}
