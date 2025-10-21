import { db } from "@/db";
import { directory } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/directory
 * Query parameters:
 * - providerName: provider name filter (optional)
 * - specialty: specialty filter (optional)
 * - search: search term for provider name (optional, uses ILIKE)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const providerName = searchParams.get("providerName");
        const specialty = searchParams.get("specialty");
        const search = searchParams.get("search");

        const conditions = [];

        if (providerName) {
            conditions.push(eq(directory.providerName, providerName));
        }

        if (specialty) {
            conditions.push(eq(directory.specialty, specialty));
        }

        if (search) {
            conditions.push(ilike(directory.providerName, `%${search}%`));
        }

        const data =
            conditions.length > 0
                ? await db.select().from(directory).where(and(...conditions))
                : await db.select().from(directory);

        return NextResponse.json({ data, count: data.length });

        return NextResponse.json({ data, count: data.length });
    } catch (error) {
        console.error("Error fetching directory:", error);
        return NextResponse.json(
            { error: "Failed to fetch directory" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/directory
 * Create a new directory entry
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const data = await db
            .insert(directory)
            .values(body)
            .returning();

        return NextResponse.json({ data: data[0] }, { status: 201 });
    } catch (error) {
        console.error("Error creating directory entry:", error);
        return NextResponse.json(
            { error: "Failed to create directory entry" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/directory
 * Update an existing directory entry
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing directory entry id" },
                { status: 400 }
            );
        }

        const data = await db
            .update(directory)
            .set(updateData)
            .where(eq(directory.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Directory entry not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error updating directory entry:", error);
        return NextResponse.json(
            { error: "Failed to update directory entry" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/directory
 * Delete a directory entry
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Missing directory entry id" },
                { status: 400 }
            );
        }

        const data = await db
            .delete(directory)
            .where(eq(directory.id, parseInt(id)))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Directory entry not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error deleting directory entry:", error);
        return NextResponse.json(
            { error: "Failed to delete directory entry" },
            { status: 500 }
        );
    }
}
