import { db } from "@/db";
import { specialtyQueries } from "@/db/queries";
import { specialties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/specialties
 * Get all specialties or filter by showOncall
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Parse query parameters
        const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
        const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : 25;
        const limit = pageSize;
        const offset = (page - 1) * pageSize;
        const search = searchParams.get("search") || undefined;
        const showOncall = searchParams.get("showOncall") !== null ? searchParams.get("showOncall") === "true" : undefined;
        const hasResidency = searchParams.get("hasResidency") !== null ? searchParams.get("hasResidency") === "true" : undefined;
        const orderByParam = searchParams.get("orderBy");
        const orderBy: 'name' | 'createdAt' | 'updatedAt' = orderByParam === 'name' || orderByParam === 'createdAt' || orderByParam === 'updatedAt' ? orderByParam : 'name';
        const orderDirectionParam = searchParams.get("orderDirection");
        const orderDirection: 'asc' | 'desc' = orderDirectionParam === 'asc' || orderDirectionParam === 'desc' ? orderDirectionParam : 'asc';

        const result = await specialtyQueries.findAll({
            limit,
            offset,
            search,
            showOncall,
            hasResidency,
            orderBy,
            orderDirection
        });

        return NextResponse.json({ data: result.data, total: result.total });
    } catch (error) {
        console.error("Error fetching specialties:", error);
        return NextResponse.json(
            { error: "Failed to fetch specialties" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/specialties
 * Create a new specialty
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const data = await db
            .insert(specialties)
            .values(body)
            .returning();

        return NextResponse.json({ data: data[0] }, { status: 201 });
    } catch (error) {
        console.error("Error creating specialty:", error);
        return NextResponse.json(
            { error: "Failed to create specialty" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/specialties
 * Update an existing specialty
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing specialty id" },
                { status: 400 }
            );
        }

        const data = await db
            .update(specialties)
            .set(updateData)
            .where(eq(specialties.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Specialty not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error updating specialty:", error);
        return NextResponse.json(
            { error: "Failed to update specialty" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/specialties
 * Delete a specialty
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Missing specialty id" },
                { status: 400 }
            );
        }

        const data = await db
            .delete(specialties)
            .where(eq(specialties.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Specialty not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error deleting specialty:", error);
        return NextResponse.json(
            { error: "Failed to delete specialty" },
            { status: 500 }
        );
    }
}
