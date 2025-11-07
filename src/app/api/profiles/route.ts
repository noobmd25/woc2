import { db } from "@/db";
import { profileQueries } from "@/db/queries";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/profiles
 * Query parameters:
 * - id: profile UUID (optional)
 * - email: user email (optional)
 * - status: profile status filter (optional)
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");
		const email = searchParams.get("email");
		const status = searchParams.get("status");

		let data;

		if (id) {
			data = await profileQueries.findById(id);
		} else if (email) {
			data = await profileQueries.findByEmail(email);
		} else if (status) {
			// For status filtering, we need to use direct query since it's not in profileQueries
			data = await db
				.select()
				.from(profiles)
				.where(eq(profiles.status, status as any));
		} else {
			// For all profiles, use direct query since it's not in profileQueries
			data = await db.select().from(profiles);
		}

		return NextResponse.json({ data, count: data.length });
	} catch (error) {
		console.error("Error fetching profiles:", error);
		return NextResponse.json(
			{ error: "Failed to fetch profiles" },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/profiles
 * Create a new profile
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		const data = await db.insert(profiles).values(body).returning();

		return NextResponse.json({ data: data[0] }, { status: 201 });
	} catch (error) {
		console.error("Error creating profile:", error);
		return NextResponse.json(
			{ error: "Failed to create profile" },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/profiles
 * Update an existing profile
 */
export async function PUT(req: NextRequest) {
	try {
		const body = await req.json();
		const { id, ...updateData } = body;

		if (!id) {
			return NextResponse.json(
				{ error: "Missing profile id" },
				{ status: 400 }
			);
		}

		// Use specific query functions for role and status updates
		if (updateData.role && Object.keys(updateData).length === 1) {
			await profileQueries.updateRole(id, updateData.role);
			// Fetch the updated profile
			const updatedProfile = await profileQueries.findById(id);
			return NextResponse.json({ data: updatedProfile[0] });
		} else if (updateData.status && Object.keys(updateData).length === 1) {
			await profileQueries.updateStatus(id, updateData.status);
			// Fetch the updated profile
			const updatedProfile = await profileQueries.findById(id);
			return NextResponse.json({ data: updatedProfile[0] });
		} else {
			// For general updates, use direct database call
			const data = await db
				.update(profiles)
				.set(updateData)
				.where(eq(profiles.id, id))
				.returning();

			if (data.length === 0) {
				return NextResponse.json(
					{ error: "Profile not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json({ data: data[0] });
		}
	} catch (error) {
		console.error("Error updating profile:", error);
		return NextResponse.json(
			{ error: "Failed to update profile" },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/profiles
 * Delete a profile
 */
export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Missing profile id" },
				{ status: 400 }
			);
		}

		const data = await db
			.delete(profiles)
			.where(eq(profiles.id, id))
			.returning();

		if (data.length === 0) {
			return NextResponse.json({ error: "Profile not found" }, { status: 404 });
		}

		return NextResponse.json({ data: data[0] });
	} catch (error) {
		console.error("Error deleting profile:", error);
		return NextResponse.json(
			{ error: "Failed to delete profile" },
			{ status: 500 }
		);
	}
}
