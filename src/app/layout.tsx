import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";

import Footer from "@/components/Footer";
import PullToRefresh from "@/components/PullToRefresh";
import SupabaseProvider from "@/components/supabase-provider";
import "@/lib/disableConsole";

import "./globals.css";

import Providers from "./providers";

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
  keywords: [
    "on-call",
    "schedule",
    "hospital",
    "providers",
    "directory",
    "healthcare",
    "roster",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: ["/favicon.ico"],
    shortcut: ["/favicon.ico"],
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
      "index": true,
      "follow": true,
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
    images: [
      { url: "/logo.png", width: 512, height: 512, alt: "Who's On Call" },
    ],
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

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#001f3f" },
  ],
};

export const runtime = "nodejs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Who's On Call",
    "url": "https://whosoncall.app",
    "logo": "https://whosoncall.app/logo.svg",
  };
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // prevent hydration mismatch
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {/* Base theme-color for legacy iOS handling */}
        <meta name="theme-color" content="#2563eb" />
        {/* iOS startup images (light & dark). Generated via pwa-asset-generator.
            Prune sizes you don't need. Keep prefers-color-scheme pairing. */}
        {/* iPhone 15/14/13/12 Pro/Pro Max (430x932 @3x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1290-2796.jpg"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2796-1290.jpg"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1290-2796.jpg"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2796-1290.jpg"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPhone 15/14/13/12 (428x926 @3x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1284-2778.jpg"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2778-1284.jpg"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1284-2778.jpg"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2778-1284.jpg"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPhone 15/14/13/12 (390x844 @3x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1170-2532.jpg"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2532-1170.jpg"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1170-2532.jpg"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2532-1170.jpg"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPhone 11/XS/X/Pro (375x812 @3x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1125-2436.jpg"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2436-1125.jpg"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1125-2436.jpg"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2436-1125.jpg"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPhone 11/XS Max/XR (414x896 @3x & @2x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1242-2688.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2688-1242.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1242-2688.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2688-1242.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-828-1792.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1792-828.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-828-1792.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1792-828.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPhone SE / 8 / 7 / 6s (375x667 @2x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-750-1334.jpg"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1334-750.jpg"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-750-1334.jpg"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1334-750.jpg"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPad Pro 12.9" (1024x1366 @2x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2048-2732.jpg"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2732-2048.jpg"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2048-2732.jpg"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2732-2048.jpg"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPad Pro 11" / Air 10.9" (834x1194 @2x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1668-2388.jpg"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2388-1668.jpg"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1668-2388.jpg"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2388-1668.jpg"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        {/* iPad 10.2" (810x1080 @2x) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-1620-2160.jpg"
          media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/light/apple-splash-2160-1620.jpg"
          media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-1620-2160.jpg"
          media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/dark/apple-splash-2160-1620.jpg"
          media="(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape) and (prefers-color-scheme: dark)"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Who's On Call" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Who's On Call" />
        <meta name="theme-color" content="#2563eb" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icon-512.png"
        />
      </head>
      <body className={`${robotoMono.variable} antialiased`}>
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
