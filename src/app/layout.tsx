import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import Footer from '@/components/Footer';
import Providers from './providers';
import SupabaseProvider from '@/components/supabase-provider';

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who's On Call",
  description: "Hospital on-call scheduling and provider directory platform",
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
