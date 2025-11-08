import { NextResponse } from "next/server";
import { Resend } from "resend";

import { ApprovalEmail } from "@/components/emails/ApprovalEmail";
import { profileQueries } from "@/db/queries";
import {
	buildApprovalPlainText,
	buildFromHeader,
	sanitizeFromRaw,
} from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  POST /api/admin/approve-user
  Body: { userId: string }
  Flow:
    1. Authenticate acting user; ensure admin + approved.
    2. Update profile status to 'approved'
    3. Send approval email via Resend (React template) if configured.
*/

export async function POST(req: Request) {
	try {
		const { supabase, commit } = await getServerSupabase();
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session?.user) {
			const res = new NextResponse("Unauthorized", { status: 401 });
			res.headers.set("Cache-Control", "no-store");
			commit(res);
			return res;
		}

		// Ensure acting user is approved admin
		const actingProfiles = await profileQueries.findById(session.user.id);
		const actingProfile = actingProfiles[0];
		if (
			!actingProfile ||
			actingProfile.role !== "admin" ||
			actingProfile.status !== "approved"
		) {
			const res = new NextResponse("Forbidden", { status: 403 });
			res.headers.set("Cache-Control", "no-store");
			commit(res);
			return res;
		}

		// Optional: basic rate limit per admin
		if (rateLimit(`admin-approve-user:${session.user.id}`)) {
			const res = NextResponse.json(
				{ ok: false, error: "Too many approval actions. Please slow down." },
				{ status: 429, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		const body = await req.json().catch(() => ({}));
		const { userId } = body || {};
		if (!userId) {
			const res = NextResponse.json(
				{ ok: false, error: "Missing userId" },
				{ status: 400, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		let email: string | null = null;
		let fullName: string | null = null;
		let role: "viewer" | "scheduler" | "admin" | null = null;

		// Load profile
		const profiles = await profileQueries.findById(userId);
		const prof = profiles[0];
		if (!prof) {
			const res = NextResponse.json(
				{ ok: false, error: "Profile not found" },
				{ status: 404, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		if (prof.status === "approved") {
			const res = NextResponse.json(
				{ ok: false, error: "User is already approved" },
				{ status: 400, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		email = prof.email;
		fullName = prof.fullName;
		role = prof.role;

		// Update profile status to approved
		await profileQueries.updateStatus(userId, "approved");

		// Send approval email via Resend using React template
		let emailStatus: "sent" | "skipped" | "error" | null = null;
		if (email) {
			const baseUrl = process.env.APP_BASE_URL || "https://www.whosoncall.app";
			const loginUrl = `${baseUrl.replace(/\/$/, "")}/`;
			const resendApiKey = process.env.RESEND_API_KEY;
			const rawFromEnv =
				process.env.APPROVAL_EMAIL_FROM ||
				process.env.RESEND_FROM ||
				"Who's On Call <cgcmd@premuss.org>";
			const rawFrom = sanitizeFromRaw(rawFromEnv);
			const fromAddress = buildFromHeader(
				rawFrom,
				"Who's On Call",
				process.env.NODE_ENV
			);
			const subject =
				process.env.APPROVAL_EMAIL_SUBJECT || "Access Granted \u2705";
			const supportEmail = process.env.SUPPORT_EMAIL || "support@premuss.org";
			if (resendApiKey && fromAddress) {
				try {
					const resend = new Resend(resendApiKey);
					const safeName = fullName || email.split("@")[0];
					// Primary path: React template
					const { data: sendData, error: sendErr } = (await resend.emails.send({
						from: fromAddress,
						to: email,
						subject,
						react: ApprovalEmail({
							name: safeName,
							loginUrl,
							baseUrl,
							supportEmail,
						}),
						text: buildApprovalPlainText({
							name: safeName,
							loginUrl,
							supportEmail,
						}),
						reply_to: supportEmail,
					})) as any;
					if (sendErr) {
						emailStatus = "error";
						try {
							await supabase.from("signup_errors").insert({
								email,
								error_text: `approval_email_failed: ${sendErr.message}`.slice(
									0,
									1000
								),
								context: {
									stage: "approval_email",
									provider: "resend",
									mode: "react",
									from: fromAddress,
									rawFrom,
								} as any,
							});
						} catch {}
					} else {
						emailStatus = "sent";
						// Optional: record success (low severity)
						try {
							await supabase.from("signup_errors").insert({
								email,
								error_text: "approval_email_sent",
								context: {
									stage: "approval_email",
									provider: "resend",
									id: sendData?.id || null,
									from: fromAddress,
								} as any,
							});
						} catch {}
					}
				} catch (err: any) {
					emailStatus = "error";
					try {
						await supabase.from("signup_errors").insert({
							email,
							error_text:
								`approval_email_exception: ${err?.message || String(err)}`.slice(
									0,
									1000
								),
							context: {
								stage: "approval_email_exception",
								provider: "resend",
								mode: "react",
								from: fromAddress,
								rawFrom,
							} as any,
						});
					} catch {}
				}
			} else if (!fromAddress) {
				emailStatus = "skipped";
				const msg =
					'approval_email_skipped: invalid FROM (set APPROVAL_EMAIL_FROM to "Who\'s On Call <email@verified-domain>")';
				if (process.env.NODE_ENV !== "production") console.warn(msg);
				try {
					await supabase.from("signup_errors").insert({
						email,
						error_text: msg,
						context: { stage: "approval_email", provider: "resend" },
					});
				} catch {}
			} else {
				emailStatus = "skipped";
				if (process.env.NODE_ENV !== "production")
					console.warn("RESEND_API_KEY missing; approval email skipped");
				try {
					await supabase.from("signup_errors").insert({
						email,
						error_text: "approval_email_skipped: missing RESEND_API_KEY",
						context: { stage: "approval_email", provider: "resend" },
					});
				} catch {}
			}
		}

		const res = NextResponse.json(
			{ ok: true, userId, role, email, emailStatus },
			{ headers: { "Cache-Control": "no-store" } }
		);
		commit(res);
		return res;
	} catch (e: any) {
		const { commit } = await getServerSupabase();
		const res = new NextResponse(e?.message ?? "Internal error", {
			status: 500,
		});
		res.headers.set("Cache-Control", "no-store");
		commit(res);
		return res;
	}
}
