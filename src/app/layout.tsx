import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import Footer from '@/components/Footer';
import Providers from './providers';

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Who's On Call",
  description: "Hospital on-call scheduling and provider directory platform",
};

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
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
