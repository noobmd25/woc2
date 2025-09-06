import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { ApprovalEmail } from '@/components/emails/ApprovalEmail';

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

    // Ensure acting user is approved admin
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
    const to: string = body?.to || 'karlunsco26@gmail.com';
    const name: string | undefined = body?.name;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      const res = NextResponse.json({ ok: false, error: 'Missing RESEND_API_KEY' }, { status: 400 });
      commit(res); return res;
    }

    const baseUrl = process.env.APP_BASE_URL || 'https://www.whosoncall.app';
    const loginUrl = `${baseUrl.replace(/\/$/, '')}/`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@premuss.org';

    const rawFrom = process.env.APPROVAL_EMAIL_FROM || process.env.RESEND_FROM || "Who's On Call <no-reply@whosoncall.app>";
    const from = buildFromHeader(rawFrom, "Who's On Call", process.env.NODE_ENV);
    if (!from) {
      const res = NextResponse.json({ ok: false, error: 'Invalid FROM address. Check APPROVAL_EMAIL_FROM/RESEND_FROM.' }, { status: 400 });
      commit(res); return res;
    }

    const resend = new Resend(resendApiKey);
    const safeName = name || (to.includes('@') ? to.split('@')[0] : 'there');
    const subject = process.env.APPROVAL_EMAIL_SUBJECT || 'Access Granted ✅';

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      react: ApprovalEmail({ name: safeName, loginUrl, baseUrl, supportEmail }),
      text: buildPlainText({ name: safeName, loginUrl, supportEmail }),
      reply_to: supportEmail,
    }) as any;

    if (error) {
      const details: any = {
        name: (error as any)?.name,
        statusCode: (error as any)?.statusCode,
        type: (error as any)?.type,
        code: (error as any)?.code,
        raw: safeSerializeError(error),
      };
      try { console.error('Resend test-approval-email failed', { from, to, subject, details }); } catch {}
      try { await supabase.from('signup_errors').insert({ email: to, error_text: `approval_email_test_failed: ${error.message}`.slice(0,1000), context: { stage: 'approval_email_test', provider: 'resend', from, ...details } }); } catch {}
      const status = (error as any)?.statusCode || 500;
      const res = NextResponse.json({ ok: false, error: error.message, details }, { status });
      commit(res); return res;
    }

    try { await supabase.from('signup_errors').insert({ email: to, error_text: 'approval_email_test_sent', context: { stage: 'approval_email_test', provider: 'resend', id: data?.id || null, from } }); } catch {}

    const res = NextResponse.json({ ok: true, id: data?.id || null, to, from });
    commit(res); return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const message = e?.message || String(e);
    const res = NextResponse.json({ ok: false, error: message }, { status: 500 });
    commit(res); return res;
  }
}

// Helpers copied to keep the route self-contained
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

function buildPlainText({ name, loginUrl, supportEmail }: { name: string; loginUrl: string; supportEmail: string }) {
  const safeName = name || 'there';
  return `Hi ${safeName},\n\nYour access to Who's On Call has been approved. You can now log in: ${loginUrl}\n\nIf you have questions contact ${supportEmail}.\n\n— The Who's On Call Team`;
}

function safeSerializeError(err: unknown) {
  try {
    return JSON.parse(JSON.stringify(err));
  } catch {
    return { message: (err as any)?.message || String(err) };
  }
}
