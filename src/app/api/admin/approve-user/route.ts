import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { Resend } from 'resend';

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
    4. Send approval email via EmailJS REST API (server-side) using private key.
       Required env vars:
        - EMAILJS_SERVICE_ID
        - EMAILJS_TEMPLATE_ID_APPROVAL
        - EMAILJS_PUBLIC_KEY
        - EMAILJS_PRIVATE_KEY (used in Authorization header if needed)
        - APP_BASE_URL (fallback include https://www.whosoncall.app)
        - EMAIL_FROM_NAME (for template params)
     Template variables expected now: user_name, login_url, current_year
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

    // Send approval email via Resend using new template
    if (email) {
      const baseUrl = process.env.APP_BASE_URL || 'https://www.whosoncall.app';
      const loginUrl = `${baseUrl.replace(/\/$/, '')}/`;
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromAddress = process.env.APPROVAL_EMAIL_FROM || "Who's On Call <no-reply@whosoncall.app>";
      const subject = process.env.APPROVAL_EMAIL_SUBJECT || "Access Granted ✅";
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const safeName = fullName || email.split('@')[0];
          const html = buildApprovalHtml({ name: safeName, loginUrl, baseUrl });
          const { error: sendErr } = await resend.emails.send({
            from: fromAddress,
            to: email,
            subject,
            html,
          }) as any;
          if (sendErr) {
            try { await supabase.from('signup_errors').insert({ email, error_text: `approval_email_failed: ${sendErr.message}`.slice(0,1000), context: { stage: 'approval_email', provider: 'resend' } }); } catch {}
          }
        } catch (err: any) {
          try { await supabase.from('signup_errors').insert({ email, error_text: `approval_email_exception: ${err?.message || String(err)}`.slice(0,1000), context: { stage: 'approval_email_exception', provider: 'resend' } }); } catch {}
        }
      } else {
        if (process.env.NODE_ENV !== 'production') console.warn('RESEND_API_KEY missing; approval email skipped');
        try { await supabase.from('signup_errors').insert({ email, error_text: 'approval_email_skipped: missing RESEND_API_KEY', context: { stage: 'approval_email', provider: 'resend' } }); } catch {}
      }
    }

    const res = NextResponse.json({ ok: true, userId: targetUserId, role, email });
    commit(res); return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const res = new NextResponse(e?.message ?? 'Internal error', { status: 500 });
    commit(res); return res;
  }
}

function buildApprovalHtml({ name, loginUrl, baseUrl }: { name: string; loginUrl: string; baseUrl: string }) {
  const escName = escapeHtml(name);
  const year = new Date().getFullYear();
  const logoUrl = `${baseUrl.replace(/\/$/, '')}/logo.png`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#eeeeee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9f9f9;border-radius:8px;overflow:hidden;color:#222;">
    <div style="background-color:#0070f3;padding:16px 24px;text-align:center;">
      <a href="${loginUrl}" target="_blank" rel="noopener"><img style="max-width:160px;height:auto;" src="${logoUrl}" alt="Who's On Call Logo" /></a>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#0070f3;margin:0 0 16px;">Access Granted ✅</h2>
      <p style="margin:16px 0;">Hi ${escName},</p>
      <p style="margin:16px 0;">Your request to access <strong>Who&apos;s On Call</strong> has been approved by an administrator.</p>
      <p style="margin:16px 0;">You can now log in and start using the platform:</p>
      <p style="margin-top:24px;"><a style="background-color:#0070f3;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;" href="${loginUrl}">Log In</a></p>
      <p style="margin-top:32px;">If you have any questions, please reach out to support.</p>
      <p style="margin-top:24px;">— The Who&apos;s On Call Team</p>
    </div>
    <div style="text-align:center;font-size:12px;color:#777;padding:16px;">© ${year} Who&apos;s On Call. All rights reserved.</div>
  </div>
</body></html>`;
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]!)); }
