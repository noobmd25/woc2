import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import Footer from '@/components/Footer';

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
        <Toaster />
        {children}
        <Footer />
      </body>
    </html>
  );

}
