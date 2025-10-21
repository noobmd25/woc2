import { db } from "@/db";
import { schedules } from "@/db/schema";
import { toISODateString } from "@/lib/date";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/schedules
 * Query parameters:
 * - date: on_call_date (exact match, optional if startDate/endDate provided)
 * - startDate: on_call_date >= startDate (optional)
 * - endDate: on_call_date < endDate (optional)
 * - specialty: specialty filter (optional)
 * - plan: healthcare_plan filter (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        const startDate = startDateParam ? toISODateString(startDateParam) : undefined;
        const endDate = endDateParam ? toISODateString(endDateParam) : undefined;
        const specialty = searchParams.get("specialty");
        const plan = searchParams.get("plan");

        // Build query conditions
        const conditions = [];

        // Date filtering: exact date OR date range
        if (date) {
            conditions.push(eq(schedules.onCallDate, date));
        } else if (startDate && endDate) {
            conditions.push(gte(schedules.onCallDate, startDate));
            conditions.push(lt(schedules.onCallDate, endDate));
        }

        // Specialty filter (optional)
        if (specialty) {
            conditions.push(eq(schedules.specialty, specialty));
        }

        // Healthcare plan filter (optional)
        if (plan !== null && plan !== undefined) {
            if (plan === "") {
                conditions.push(isNull(schedules.healthcarePlan));
            } else {
                conditions.push(eq(schedules.healthcarePlan, plan));
            }
        }

        const data = await db
            .select()
            .from(schedules)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return NextResponse.json({ data, count: data.length });
    } catch (error) {
        console.error("Error fetching schedules:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedules" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/schedules
 * Create a new schedule entry or multiple entries (bulk insert)
 * Body: single object or array of objects
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Support both single entry and bulk insert
        const entries = Array.isArray(body) ? body : [body];

        const data = await db
            .insert(schedules)
            .values(entries)
            .returning();

        return NextResponse.json({
            data: Array.isArray(body) ? data : data[0],
            count: data.length
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating schedule:", error);
        return NextResponse.json(
            { error: "Failed to create schedule" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/schedules
 * Update an existing schedule entry
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Missing schedule id" },
                { status: 400 }
            );
        }

        const data = await db
            .update(schedules)
            .set(updateData)
            .where(eq(schedules.id, id))
            .returning();

        if (data.length === 0) {
            return NextResponse.json(
                { error: "Schedule not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error) {
        console.error("Error updating schedule:", error);
        return NextResponse.json(
            { error: "Failed to update schedule" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/schedules
 * Delete schedule entry(ies)
 * Query parameters:
 * - id: delete by ID (optional)
 * - date: on_call_date (optional, for complex deletes)
 * - startDate/endDate: date range (optional, for clearing months)
 * - providerName: provider_name (optional)
 * - specialty: specialty (optional)
 * - plan: healthcare_plan (optional)
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const date = searchParams.get("date");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const providerName = searchParams.get("providerName");
        const specialty = searchParams.get("specialty");
        const plan = searchParams.get("plan");

        // Build delete conditions
        const conditions = [];

        if (id) {
            // Simple delete by ID
            conditions.push(eq(schedules.id, parseInt(id)));
        } else {
            // Complex delete by date/provider/specialty/plan
            if (date) {
                conditions.push(eq(schedules.onCallDate, date));
            }
            if (startDate && endDate) {
                conditions.push(gte(schedules.onCallDate, startDate));
                conditions.push(lt(schedules.onCallDate, endDate));
            }
            if (providerName) {
                conditions.push(eq(schedules.providerName, providerName));
            }
            if (specialty) {
                conditions.push(eq(schedules.specialty, specialty));
            }
            if (plan !== null && plan !== undefined) {
                if (plan === "") {
                    conditions.push(isNull(schedules.healthcarePlan));
                } else {
                    conditions.push(eq(schedules.healthcarePlan, plan));
                }
            }
        }

        if (conditions.length === 0) {
            return NextResponse.json(
                { error: "No delete conditions provided" },
                { status: 400 }
            );
        }

        const data = await db
            .delete(schedules)
            .where(and(...conditions))
            .returning();

        return NextResponse.json({
            data,
            count: data.length
        });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json(
            { error: "Failed to delete schedule" },
            { status: 500 }
        );
    }
}
