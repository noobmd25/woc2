import { profileQueries } from "@/db/queries";
import { NextResponse } from "next/server";

// GET /api/analytics/users
export async function GET() {
	try {
		// Fetch all user counts in one query
		const counts = await profileQueries.getUserCounts();

		return NextResponse.json(counts);
	} catch (error) {
		console.error("Error fetching user analytics:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user analytics" },
			{ status: 500 }
		);
	}
}
