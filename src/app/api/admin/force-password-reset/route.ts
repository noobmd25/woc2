import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { buildFromHeader, sanitizeFromRaw } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const { supabase, commit } = await getServerSupabase();

    // AuthN
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      const res = new NextResponse("Unauthorized", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
      commit(res);
      return res;
    }

    // AuthZ: admin + approved only
    const { data: actingProfile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", session.user.id)
      .single();
    if (
      !actingProfile ||
      actingProfile.role !== "admin" ||
      actingProfile.status !== "approved"
    ) {
      const res = new NextResponse("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
      commit(res);
      return res;
    }

    const body = await req.json().catch(() => ({}));
    const email: string = (body?.email || "").toString().trim().toLowerCase();
    if (!isEmail(email)) {
      const res = json({ ok: false, error: "Invalid email" }, { status: 400 });
      commit(res);
      return res;
    }

    // Rate limit by acting admin and by target
    if (
      rateLimit(`admin-force-reset:${session.user.id}`) ||
      rateLimit(`admin-force-reset-target:${email}`)
    ) {
      const res = json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
      commit(res);
      return res;
    }

    // Env checks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const fromRawSource =
      process.env.RESEND_FROM ||
      process.env.APPROVAL_EMAIL_FROM ||
      "Who's On Call <onboarding@resend.dev>";
    if (!supabaseUrl || !serviceKey) {
      const res = json(
        { ok: false, error: "Server not configured (missing SUPABASE env)." },
        { status: 500 },
      );
      commit(res);
      return res;
    }
    if (!resendKey) {
      const res = json(
        { ok: false, error: "Server not configured (missing RESEND_API_KEY)." },
        { status: 500 },
      );
      commit(res);
      return res;
    }

    // Build redirect URL for the recovery link
    let origin: string;
    try {
      origin =
        process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        new URL(req.url).origin;
    } catch {
      origin = "http://localhost:3000";
    }
    const redirectTo = `${origin.replace(/\/+$/, "")}/update-password`;

    // 1) Generate Supabase recovery link using service role
    const admin = createSupabaseAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) {
      // Best-effort log
      try {
        await supabase.from("signup_errors").insert({
          email,
          error_text:
            `generate_link_failed: ${error?.message || "unknown"}`.slice(
              0,
              1000,
            ),
          context: { stage: "force_reset_generate", redirectTo },
        });
      } catch {}
      const res = json(
        { ok: false, error: error?.message || "Failed to generate reset link" },
        { status: 400 },
      );
      commit(res);
      return res;
    }

    const resetLink = data.properties.action_link as string;

    // 2) Send email via Resend
    const resend = new Resend(resendKey);
    const fromRaw = sanitizeFromRaw(fromRawSource);
    const from = buildFromHeader(
      fromRaw,
      "Who's On Call",
      process.env.NODE_ENV,
    );
    if (!from) {
      const res = json(
        {
          ok: false,
          error: "Invalid FROM address. Check RESEND_FROM/APPROVAL_EMAIL_FROM.",
        },
        { status: 400 },
      );
      commit(res);
      return res;
    }

    const subject = "Reset your Who's On Call password";
    const support = process.env.SUPPORT_EMAIL || "support@whosoncall.app";

    const html = `
      <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a; line-height:1.5;">
        <h1 style="font-size:20px; margin:0 0 16px;">Reset your password</h1>
        <p style="margin:0 0 16px;">An administrator requested a password reset for your Who's On Call account.</p>
        <p style="margin:0 0 16px;">Click the button below to set a new password. If you didn’t request this, you can safely ignore this email.</p>
        <p style="margin:24px 0;">
          <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">
            Set new password
          </a>
        </p>
        <p style="margin:16px 0; font-size:14px; color:#334155;">If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="margin:0; font-size:12px; color:#475569; word-break:break-all;">${resetLink}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0; margin:24px 0;">
        <p style="margin:0; font-size:12px; color:#64748b;">Need help? Contact us at ${support}.</p>
      </div>
    `.trim();

    const text =
      `Reset your Who's On Call password\n\nAn administrator requested a password reset for your account.\n\nSet new password: ${resetLink}\n\nIf you didn’t request this, ignore this email.\nSupport: ${support}`.trim();

    const sendRes: any = await resend.emails.send({
      from,
      to: email,
      subject,
      html,
      text,
      reply_to: support,
    });

    if (sendRes?.error) {
      try {
        await supabase.from("signup_errors").insert({
          email,
          error_text: `resend_send_failed: ${sendRes.error.message}`.slice(
            0,
            1000,
          ),
          context: { stage: "force_reset_send", from },
        });
      } catch {}
      const res = json(
        { ok: false, error: sendRes.error.message || "Failed to send email" },
        { status: sendRes.error.statusCode || 502 },
      );
      commit(res);
      return res;
    }

    try {
      await supabase.from("signup_errors").insert({
        email,
        error_text: "force_reset_sent",
        context: { stage: "force_reset", from },
      });
    } catch {}

    const res = json({ ok: true, email });
    commit(res);
    return res;
  } catch (e: any) {
    const { commit } = await getServerSupabase();
    const res = json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 },
    );
    commit(res);
    return res;
  }
}
