import { NextResponse } from "next/server";

import { profileQueries } from "@/db/queries";
import { rateLimit } from "@/lib/rateLimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  POST /api/admin/deny-user
  Body: { userId: string, reason?: string }
  Flow:
    1. Authenticate acting user; ensure admin + approved.
    2. Update profile status to 'denied' and set denial_reason
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
		if (rateLimit(`admin-deny-user:${session.user.id}`)) {
			const res = NextResponse.json(
				{ ok: false, error: "Too many denial actions. Please slow down." },
				{ status: 429, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		const body = await req.json().catch(() => ({}));
		const { userId, reason } = body || {};
		if (!userId) {
			const res = NextResponse.json(
				{ ok: false, error: "Missing userId" },
				{ status: 400, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

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

		if (prof.status === "denied") {
			const res = NextResponse.json(
				{ ok: false, error: "User is already denied" },
				{ status: 400, headers: { "Cache-Control": "no-store" } }
			);
			commit(res);
			return res;
		}

		// Update profile status to denied
		await profileQueries.denyUser(userId, reason);

		const res = NextResponse.json(
			{ ok: true, message: "User denied successfully" },
			{ headers: { "Cache-Control": "no-store" } }
		);
		commit(res);
		return res;
	} catch (error: any) {
		console.error("Deny user error:", error);
		const res = NextResponse.json(
			{ ok: false, error: error.message || "Internal server error" },
			{ status: 500, headers: { "Cache-Control": "no-store" } }
		);
		return res;
	}
}
