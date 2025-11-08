import { profileQueries } from "@/db/queries";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users
export async function GET(req: NextRequest) {
	try {
		// Check admin access (simplified - you might want to add proper auth)
		// For now, assuming auth is handled elsewhere

		const { searchParams } = new URL(req.url);

		// Parse query parameters
		const page = searchParams.get("page")
			? parseInt(searchParams.get("page")!)
			: 1;
		const pageSize = searchParams.get("pageSize")
			? parseInt(searchParams.get("pageSize")!)
			: 20;
		const limit = pageSize;
		const offset = (page - 1) * pageSize;
		const search = searchParams.get("search") || undefined;
		const status =
			(searchParams.get("status") as
				| "pending"
				| "approved"
				| "denied"
				| "revoked") || undefined;
		const excludeStatus =
			(searchParams.get("excludeStatus") as
				| "pending"
				| "approved"
				| "denied"
				| "revoked") || undefined;
		const sortBy =
			(searchParams.get("sortBy") as
				| "full_name"
				| "email"
				| "role"
				| "created_at"
				| "id") || "full_name";
		const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "asc";

		const result = await profileQueries.findAll({
			limit,
			offset,
			search,
			status,
			excludeStatus,
			sortBy,
			sortDir,
		});

		return NextResponse.json({
			rows: result.data,
			nextCursor: null,
			count: result.total,
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 }
		);
	}
}
