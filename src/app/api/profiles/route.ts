import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/profiles
 * Query parameters:
 * - id: profile UUID (optional)
 * - email: user email (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const email = searchParams.get("email");

        let data;

        if (id) {
            data = await db.select().from(profiles).where(eq(profiles.id, id));
        } else if (email) {
            data = await db.select().from(profiles).where(eq(profiles.email, email));
        } else {
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

        const data = await db
            .insert(profiles)
            .values(body)
            .returning();

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
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
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
