// app/layout.tsx
import "@/lib/disableConsole";
import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";

import Header from "@/components/Header";
import { getUserAndProfile } from "@/lib/access";
import { Providers } from "./providers"; // client wrapper

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whosoncall.app"),
  title: "Who's On Call",
  applicationName: "Who's On Call",
  description: "Hospital on-call scheduling made simple.",
  generator: "Next.js",
  authors: [{ name: "Who's On Call" }],
  creator: "Who's On Call",
  publisher: "Who's On Call",
  category: "Healthcare",
  keywords: ["on-call", "schedule", "hospital", "providers", "directory", "healthcare", "roster"],
  manifest: "/manifest.json",
  icons: {
    icon: ["/favicon.ico"],
    apple: ["/apple-touch-icon.png"],
    other: [
      { rel: "icon", url: "/icon-192.png" },
      { rel: "icon", url: "/icon-512.png" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
  },
  formatDetection: { telephone: true, email: true, address: false },
  alternates: { canonical: "https://whosoncall.app" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    title: "Who's On Call",
    description: "Hospital on-call scheduling made simple.",
    url: "https://whosoncall.app",
    siteName: "Who's On Call",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Who's On Call" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Who's On Call",
    description: "Hospital on-call scheduling made simple.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#001f3f" },
  ],
};

export const runtime = "nodejs";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Who's On Call",
    url: "https://whosoncall.app",
    logo: "https://whosoncall.app/logo.svg",
  };

  // server-side: only fetch once here
  const { user } = await getUserAndProfile();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Who's On Call" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Who's On Call" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className={`${robotoMono.variable} antialiased bg-white dark:bg-black`}>
        <Providers initialUser={user}>
          <Header />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}