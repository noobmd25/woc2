// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from 'next/server';

/**
 * Server-only Supabase client.
 * Returns { supabase, commit } where commit(res) applies any cookies requested by the Supabase helper to the provided NextResponse.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies(); // <-- fix: await

  // Read all cookies once
  const allCookiesRaw = cookieStore.getAll();

  // Heuristic: find a Supabase auth cookie by common name patterns
  const supCookie = allCookiesRaw.find((c) => /(^sb:|^sb-|supabase|sb_token|supabase-auth)/i.test(c.name));

  // Normalize cookie values: if supabase cookie contains a JSON array string, extract first element
  const normalizeValue = (raw: string) => {
    // Try to safely decode percent-encoded values (handle single or double encoding)
    const safeDecode = (input: string) => {
      let cur = input;
      for (let i = 0; i < 3; i++) {
        try {
          const decoded = decodeURIComponent(cur);
          if (decoded === cur) break;
          cur = decoded;
        } catch (e) {
          break;
        }
      }
      return cur;
    };

    try {
      const decoded = safeDecode(raw ?? '');
      // If it looks like a JSON array, parse and return first element if string
      if (decoded && decoded.trim().startsWith('[')) {
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    return raw;
  };

  // Build ordered list with the Supabase cookie first (if found) and normalized values
  const orderedCookies = supCookie
    ? [supCookie, ...allCookiesRaw.filter((c) => c.name !== supCookie.name)]
    : allCookiesRaw;

  const normalizedCookies = orderedCookies.map(c => ({ name: c.name, value: normalizeValue(String(c.value)) }));

  // Debug: Log all cookies being read by the server
  if (process.env.NODE_ENV !== 'production') {
    const allCookies = normalizedCookies.map(c => `${c.name}: ${c.value}`).join('; ');
    console.log('[supabaseServer] Cookies seen by server (ordered, normalized):', allCookies);
    console.log('[supabaseServer] Supabase cookie chosen:', supCookie?.name ?? 'none');
  }

  // capture cookies that the supabase helper wants to set on the response
  const pendingSetCookies: Array<{ name: string; value: string | null; options?: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return array of { name, value } objects as expected by the Supabase SSR helper
          return normalizedCookies.map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet: Array<{ name: string; value: string | null; options?: any }>) {
          // Instead of trying to mutate NextResponse here (not available), capture cookies and let the route handler commit them.
          for (const c of cookiesToSet) pendingSetCookies.push(c);
        },
      },
    }
  );

  const commit = (res: NextResponse) => {
    try {
      for (const c of pendingSetCookies) {
        // apply reasonable defaults; preserve provided options where possible
        const opts = {
          path: '/',
          httpOnly: true,
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
          ...(c.options ?? {}),
        } as any;
        res.cookies.set(c.name, c.value ?? '', opts);
      }
    } catch (e) {
      console.error('[supabaseServer] commit cookies error', e);
    }
  };

  return { supabase, commit };
}