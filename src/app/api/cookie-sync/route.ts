import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string | undefined = body?.name;
    const value: string | undefined = body?.value;

    if (!name || !value) {
      return NextResponse.json({ ok: false, message: 'Missing name or value' }, { status: 400 });
    }

    // Normalize value: if it's a JSON array string, use first element (common for Supabase cookie format)
    let normalized = value;
    const safeDecode = (input: string) => {
      let cur = input;
      for (let i = 0; i < 3; i++) {
        try {
          const decoded = decodeURIComponent(cur);
          if (decoded === cur) break;
          cur = decoded;
        } catch {
          break;
        }
      }
      return cur;
    };

    try {
      normalized = safeDecode(String(normalized ?? ''));
      if (normalized && normalized.trim().startsWith('[')) {
        const parsed = JSON.parse(normalized);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          normalized = parsed[0];
        }
      }
    } catch {
      // ignore parse errors
    }

    const res = NextResponse.json({
      ok: true,
      name,
      valueLength: String(normalized)?.length ?? 0,
      incomingCookieHeader: String(req.headers.get('cookie') ?? ''),
    });

    // Set cookie on the server response so subsequent server-side requests can see it.
    // Use Lax sameSite to match what Supabase typically sets; httpOnly=true to match auth cookies.
    res.cookies.set(name, normalized, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Let the browser manage expiry; we don't set maxAge here.
    });

    return res;
  } catch (e: any) {
    // Keep a single error log for observability. Client can surface toast based on response.
    console.error('[api/cookie-sync] error', e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}
