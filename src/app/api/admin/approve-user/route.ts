import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

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

    // Send email via EmailJS (server-side fetch)
    if (email) {
      const serviceId = process.env.EMAILJS_SERVICE_ID;
      const templateId = process.env.EMAILJS_TEMPLATE_ID_APPROVAL;
      const publicKey = process.env.EMAILJS_PUBLIC_KEY;
      const privateKey = process.env.EMAILJS_PRIVATE_KEY;
      const baseUrl = process.env.APP_BASE_URL || 'https://www.whosoncall.app';
      const fromName = process.env.EMAIL_FROM_NAME || "Who's On Call"; // retained for template completeness
      const loginUrl = `${baseUrl.replace(/\/$/, '')}/`;

      if (serviceId && templateId && publicKey) {
        try {
          const params: Record<string, string> = {
            user_name: fullName || email.split('@')[0],
            login_url: loginUrl,
            current_year: String(new Date().getFullYear()),
          };

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (privateKey) headers['Authorization'] = `Bearer ${privateKey}`;

          const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              template_params: params,
            }),
          });
          // Suppress non-critical logging in production; could record to external monitoring here.
          if (!resp.ok) {
            // no console output per logging policy
          }
        } catch {
          // swallow email errors (non-critical)
        }
      }
    }

    const res = NextResponse.json({ ok: true, userId: targetUserId, role, email });
    commit(res);
    return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const res = new NextResponse(e?.message ?? 'Internal error', { status: 500 });
    commit(res);
    return res;
  }
}
