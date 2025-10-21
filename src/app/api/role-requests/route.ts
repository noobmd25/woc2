import { db } from "@/db";
import { roleRequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/role-requests
 * Query parameters:
 * - id: request UUID (optional)
 * - userId: user UUID (optional)
 * - status: request status (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const userId = searchParams.get("userId");
        const status = searchParams.get("status");

        const conditions = [];

        if (id) {
            conditions.push(eq(roleRequests.id, id));
        }

        if (userId) {
            conditions.push(eq(roleRequests.userId, userId));
        }

        if (status) {
            conditions.push(eq(roleRequests.status, status as any));
        }

        const query = db.select().from(roleRequests);

        const data =
            conditions.length > 0
                ? await db.select().from(roleRequests).where(and(...conditions))
                : await query;

        return NextResponse.json({ data, count: data.length });
    } catch (error) {
        console.error("Error fetching role requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch role requests" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/role-requests
 * Create a new role request
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const data = await db
            .insert(roleRequests)
            .values(body)
            .returning();

        return NextResponse.json({ data: data[0] }, { status: 201 });
    } catch (error) {
        console.error("Error creating role request:", error);
        return NextResponse.json(
            { error: "Failed to create role request" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/role-requests
 * Update an existing role request
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing role request id" },
                { status: 400 }
            );
        }

        const data = await db
            .update(roleRequests)
            .set(updateData)
            .where(eq(roleRequests.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Role request not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error updating role request:", error);
        return NextResponse.json(
            { error: "Failed to update role request" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/role-requests
 * Delete a role request
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Missing role request id" },
                { status: 400 }
            );
        }

        const data = await db
            .delete(roleRequests)
            .where(eq(roleRequests.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Role request not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error deleting role request:", error);
        return NextResponse.json(
            { error: "Failed to delete role request" },
            { status: 500 }
        );
    }
}
