import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { ApprovalEmail } from '@/components/emails/ApprovalEmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  POST /api/admin/approve-user
  Body: { requestId?: string, userId?: string }
  One of requestId (role_requests.id) or userId (profiles.id) is required.
  Flow:
    1. Authenticate acting user; ensure admin + approved.
    2. If requestId provided: call RPC approve_role_request(p_request_id, p_decider, p_role, p_reason)
       - Determine desired role from role_requests.requested_role
       - Mark profile.status='approved' & profile.role=that role (RPC expected to do it).
    3. Else if userId provided: directly update profiles (status='approved', keep existing role or default 'viewer').
    4. Send approval email via Resend (React template) if configured.
*/

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
    const { requestId, userId } = body || {};
    if (!requestId && !userId) {
      const res = NextResponse.json({ ok: false, error: 'Missing requestId or userId' }, { status: 400 });
      commit(res); return res;
    }

    let targetUserId: string | null = null;
    let email: string | null = null;
    let fullName: string | null = null;
    let role: string | null = null;

    if (requestId) {
      // Load role request
      const { data: reqRow, error: reqErr } = await supabase
        .from('role_requests')
        .select('id, user_id, email, requested_role, metadata')
        .eq('id', requestId)
        .single();
      if (reqErr || !reqRow) {
        const res = NextResponse.json({ ok: false, error: 'Role request not found' }, { status: 404 });
        commit(res); return res;
      }
      targetUserId = reqRow.user_id;
      email = reqRow.email;
      role = reqRow.requested_role;
      fullName = (reqRow as any)?.metadata?.full_name || (reqRow as any)?.metadata?.fullName || null;

      if (!targetUserId) {
        const res = NextResponse.json({ ok: false, error: 'Role request missing user_id' }, { status: 400 });
        commit(res); return res;
      }

      // Call RPC to perform approval logic (should update role_requests + profiles atomically)
      const { error: rpcErr } = await supabase.rpc('approve_role_request', {
        p_request_id: requestId,
        p_decider: session.user.id,
        p_role: role ?? 'viewer',
        p_reason: null
      });
      if (rpcErr) {
        const res = NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
        commit(res); return res;
      }
    } else if (userId) {
      targetUserId = userId;
      // Load profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status')
        .eq('id', userId)
        .single();
      if (profErr || !prof) {
        const res = NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 });
        commit(res); return res;
      }
      email = prof.email;
      fullName = prof.full_name;
      role = prof.role || 'viewer';

      // Update profile directly
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ status: 'approved', role })
        .eq('id', userId);
      if (updErr) {
        const res = NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
        commit(res); return res;
      }
    }

    // Fallback: if fullName still missing, look it up from profiles (ensures email template has a name)
    if (!fullName && targetUserId) {
      const { data: profName } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .maybeSingle();
      if (profName?.full_name) fullName = profName.full_name;
    }

    // Send approval email via Resend using React template
    let emailStatus: 'sent' | 'skipped' | 'error' | null = null;
    if (email) {
      const baseUrl = process.env.APP_BASE_URL || 'https://www.whosoncall.app';
      const loginUrl = `${baseUrl.replace(/\/$/, '')}/`;
      const resendApiKey = process.env.RESEND_API_KEY;
      const rawFromEnv = process.env.APPROVAL_EMAIL_FROM || process.env.RESEND_FROM || "Who's On Call <cgcmd@premuss.org>";
      const rawFrom = sanitizeFromRaw(rawFromEnv);
      const fromAddress = buildFromHeader(rawFrom, "Who's On Call", process.env.NODE_ENV);
      const subject = process.env.APPROVAL_EMAIL_SUBJECT || 'Access Granted ✅';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@premuss.org';
      if (resendApiKey && fromAddress) {
        try {
          const resend = new Resend(resendApiKey);
          const safeName = fullName || email.split('@')[0];
          // Primary path: React template
          const { data: sendData, error: sendErr } = await resend.emails.send({
            from: fromAddress,
            to: email,
            subject,
            react: ApprovalEmail({ name: safeName, loginUrl, baseUrl, supportEmail }),
            text: buildPlainText({ name: safeName, loginUrl, supportEmail }),
            reply_to: supportEmail,
          }) as any;
          if (sendErr) {
            emailStatus = 'error';
            try { await supabase.from('signup_errors').insert({ email, error_text: `approval_email_failed: ${sendErr.message}`.slice(0,1000), context: { stage: 'approval_email', provider: 'resend', mode: 'react', from: fromAddress, rawFrom } }); } catch {}
          } else {
            emailStatus = 'sent';
            // Optional: record success (low severity)
            try { await supabase.from('signup_errors').insert({ email, error_text: 'approval_email_sent', context: { stage: 'approval_email', provider: 'resend', id: sendData?.id || null, from: fromAddress } }); } catch {}
          }
        } catch (err: any) {
          emailStatus = 'error';
          try { await supabase.from('signup_errors').insert({ email, error_text: `approval_email_exception: ${err?.message || String(err)}`.slice(0,1000), context: { stage: 'approval_email_exception', provider: 'resend', mode: 'react', from: fromAddress, rawFrom } }); } catch {}
        }
      } else if (!fromAddress) {
        emailStatus = 'skipped';
        const msg = 'approval_email_skipped: invalid FROM (set APPROVAL_EMAIL_FROM to "Who\'s On Call <email@verified-domain>")';
        if (process.env.NODE_ENV !== 'production') console.warn(msg);
        try { await supabase.from('signup_errors').insert({ email, error_text: msg, context: { stage: 'approval_email', provider: 'resend' } }); } catch {}
      } else {
        emailStatus = 'skipped';
        if (process.env.NODE_ENV !== 'production') console.warn('RESEND_API_KEY missing; approval email skipped');
        try { await supabase.from('signup_errors').insert({ email, error_text: 'approval_email_skipped: missing RESEND_API_KEY', context: { stage: 'approval_email', provider: 'resend' } }); } catch {}
      }
    }

    const res = NextResponse.json({ ok: true, userId: targetUserId, role, email, emailStatus });
    commit(res); return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const res = new NextResponse(e?.message ?? 'Internal error', { status: 500 });
    commit(res); return res;
  }
}

// Plain-text fallback for email clients / logs
function buildPlainText({ name, loginUrl, supportEmail }: { name: string; loginUrl: string; supportEmail: string }) {
  const safeName = name || 'there';
  return `Hi ${safeName},\n\nYour access to Who's On Call has been approved. You can now log in: ${loginUrl}\n\nIf you have questions contact ${supportEmail}.\n\n— The Who's On Call Team`;
}

// Validate/build a proper "From" header for Resend
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
  // Dev fallback allowed by Resend without domain verification
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
