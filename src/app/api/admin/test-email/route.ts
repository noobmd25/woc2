import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { supabase, commit } = await getServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const res = new NextResponse('Unauthorized', { status: 401 });
      commit(res); return res;
    }

    const { data: actingProfile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', session.user.id)
      .single();
    if (!actingProfile || actingProfile.role !== 'admin' || actingProfile.status !== 'approved') {
      const res = new NextResponse('Forbidden', { status: 403 });
      commit(res); return res;
    }

    const body = await req.json().catch(() => ({}));
    const to: string = body?.to || 'cgcmd@premuss.org';
    const useOnboarding: boolean = body?.useOnboarding !== false; // default true
    const subject: string = body?.subject || "Test: Who's On Call email pipeline";

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      const res = NextResponse.json({ ok: false, error: 'Missing RESEND_API_KEY' }, { status: 400 });
      commit(res); return res;
    }

    const fromRawSource = useOnboarding
      ? "Who's On Call <onboarding@resend.dev>"
      : (process.env.APPROVAL_EMAIL_FROM || process.env.RESEND_FROM || "Who's On Call <cgcmd@premuss.org>");

    const fromRaw = sanitizeFromRaw(fromRawSource);
    const from = buildFromHeader(fromRaw, "Who's On Call", process.env.NODE_ENV);
    if (!from) {
      const res = NextResponse.json({ ok: false, error: 'Invalid FROM address. Check APPROVAL_EMAIL_FROM/RESEND_FROM.', details: { rawFrom: fromRaw } }, { status: 400 });
      commit(res); return res;
    }

    const resend = new Resend(resendApiKey);
    const html = `<p>This is a test email from <strong>Who's On Call</strong>. If you received this, the Resend pipeline is working.</p>`;
    const text = "This is a test email from Who's On Call. If you received this, the Resend pipeline is working.";

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: process.env.SUPPORT_EMAIL || 'support@premuss.org',
    }) as any;

    if (error) {
      const details: any = {
        name: (error as any)?.name,
        statusCode: (error as any)?.statusCode,
        type: (error as any)?.type,
        code: (error as any)?.code,
        raw: safeSerializeError(error),
        from,
        rawFrom: fromRaw,
      };
      // Server-side log for quick diagnosis during dev
      try { console.error('Resend test-email failed', { from, to, subject, details }); } catch {}
      try { await supabase.from('signup_errors').insert({ email: to, error_text: `test_email_failed: ${error.message}`.slice(0,1000), context: { stage: 'test_email', provider: 'resend', from, rawFrom: fromRaw, ...details } }); } catch {}
      const status = (error as any)?.statusCode || 500;
      const res = NextResponse.json({ ok: false, error: error.message, details }, { status });
      commit(res); return res;
    }

    try { await supabase.from('signup_errors').insert({ email: to, error_text: 'test_email_sent', context: { stage: 'test_email', provider: 'resend', id: data?.id || null, from } }); } catch {}

    const res = NextResponse.json({ ok: true, id: data?.id || null, to, from });
    commit(res); return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const message = e?.message || String(e);
    const res = NextResponse.json({ ok: false, error: message }, { status: 500 });
    commit(res); return res;
  }
}

function buildFromHeader(raw: string | undefined, defaultName: string, env?: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.includes('<') && trimmed.includes('>')) {
      const inner = trimmed.substring(trimmed.indexOf('<') + 1, trimmed.indexOf('>')).trim();
      return emailRegex.test(inner) ? trimmed : null;
    }
    if (emailRegex.test(trimmed)) {
      return `${defaultName} <${trimmed}>`;
    }
    return null;
  }
  if (env !== 'production') return 'onboarding@resend.dev';
  return null;
}

function sanitizeFromRaw(raw?: string) {
  if (!raw) return raw;
  let s = raw.trim();
  const qStart = s[0];
  const qEnd = s[s.length - 1];
  const openQuotes = new Set(['"', "'", '\u2018', '\u201C']);
  const closeQuotes = new Set(['"', "'", '\u2019', '\u201D']);
  if (openQuotes.has(qStart) && closeQuotes.has(qEnd)) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\u2019/g, "'");
  return s;
}

function safeSerializeError(err: unknown) {
  try {
    return JSON.parse(JSON.stringify(err));
  } catch {
    return { message: (err as any)?.message || String(err) };
  }
}
