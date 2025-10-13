# iOS PWA Installability & Validation Guide

This document describes how to ensure the Who's On Call app is installable and presents properly on iOS (Safari) and other platforms.

## 1. Manifest File

The production manifest lives at `/public/manifest.json`.
Key requirements satisfied:

- `name`, `short_name`, `description`
- `start_url` uses a query parameter to distinguish PWA launches
- `display` set to `standalone` with `display_override`
- `background_color` + `theme_color`
- Icons (192, 512). Add a maskable icon if you want adaptive shapes on Android:

Example add (create a 512x512 with safe-zone):

```json
{
  "src": "/icon-512-maskable.png",
  "sizes": "512x512",
  "type": "image/png",
  "purpose": "any maskable"
}
```

## 2. Apple Touch Icon

Ensure an optimized icon at `/public/apple-touch-icon.png` (at least 180x180). Apple ignores `purpose` maskable.

## 3. iOS Splash Screens

Generated via `pwa-asset-generator` into `/public/splash/light` and `/public/splash/dark` and linked in `app/layout.tsx` with media queries including `prefers-color-scheme`. Regenerate when logo/branding changes:

```bash
npm run pwa:splash
```

## 4. Head Metadata (Already Implemented)

`app/layout.tsx` includes:

- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Who's On Call">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<link rel="manifest" href="/manifest.json">`

## 5. Testing Installation (iOS)

1. Deploy to a HTTPS domain (no self-signed certs).
2. Open Safari > navigate to the site root.
3. Confirm: Address bar shows "Add to Home Screen" in Share Sheet.
4. Tap Add; launch from home screen.
5. Verify: No Safari UI, correct splash screen, status bar color, standalone behavior.

## 6. Validation Checklist

- [ ] Manifest loads (200) at `/manifest.json`.
- [ ] Icons load (open each URL directly).
- [ ] Apple touch icon loads.
- [ ] Splash screen images load (spot check a few).
- [ ] Service worker (optional future) not required for basic iOS installability but needed for offline.
- [ ] App launches without Safari chrome.
- [ ] Theme color bar matches brand (#2563eb light mode).

## 7. Service Worker (Future Enhancement)

Add a service worker for offline & caching when ready. With Next.js App Router you can integrate `next-pwa` or a custom SW registered in a client component.

## 8. Common Pitfalls

- Missing or incorrect `apple-touch-icon` size.
- Using only `site.webmanifest` but referencing `/manifest.json` (ensure consistency).
- Splash images not matching device aspect ratio (iOS will letterbox or ignore).
- Transparent backgrounds on splash causing unwanted system color fill.

## 9. Regeneration Workflow

When branding updates:

1. Replace `public/brand/wordmark.png`.
2. Run `npm run pwa:splash`.
3. Commit new `/public/splash/**` assets.
4. (Optional) Add maskable icon and update manifest.

## 10. Lighthouse / DevTools

Use Chrome DevTools Application > Manifest to verify fields (on desktop). Use Lighthouse PWA audit for additional guidance.

---

Maintained for internal use. Update as platform requirements evolve.
