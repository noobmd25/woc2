/**
 * Example API route using Drizzle ORM
 * This demonstrates how to use Drizzle queries in Next.js API routes
 */

import { db } from "@/db";
import { scheduleQueries } from "@/db/queries";
import { schedules } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const specialty = searchParams.get("specialty");
        const provider = searchParams.get("provider");

        // Example 1: Using pre-built queries
        if (startDate && endDate) {
            const results = await scheduleQueries.findByDateRange(
                new Date(startDate),
                new Date(endDate)
            );
            return NextResponse.json(results);
        }

        // Example 2: Using direct Drizzle queries with specialty filter
        if (specialty) {
            const results = await db
                .select()
                .from(schedules)
                .where(eq(schedules.specialty, specialty))
                .orderBy(schedules.onCallDate);

            return NextResponse.json(results);
        }

        // Example 3: Complex query with multiple conditions
        if (provider && startDate) {
            const results = await db
                .select()
                .from(schedules)
                .where(
                    and(
                        eq(schedules.providerName, provider),
                        gte(schedules.onCallDate, startDate)
                    )
                )
                .limit(10);

            return NextResponse.json(results);
        }

        // Default: return all schedules (with pagination in production)
        const results = await db
            .select()
            .from(schedules)
            .limit(100);

        return NextResponse.json(results);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedules" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Example 4: Insert a new schedule
        const newSchedule = await db
            .insert(schedules)
            .values({
                providerName: body.providerName,
                onCallDate: body.onCallDate,
                specialty: body.specialty,
                healthcarePlan: body.healthcarePlan,
                showSecondPhone: body.showSecondPhone,
                secondPhonePref: body.secondPhonePref,
            })
            .returning();

        return NextResponse.json(newSchedule[0], { status: 201 });
    } catch (error) {
        console.error("Error creating schedule:", error);
        return NextResponse.json(
            { error: "Failed to create schedule" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Schedule ID is required" },
                { status: 400 }
            );
        }

        // Example 5: Update a schedule
        const updatedSchedule = await db
            .update(schedules)
            .set(updates)
            .where(eq(schedules.id, id))
            .returning();

        if (updatedSchedule.length === 0) {
            return NextResponse.json(
                { error: "Schedule not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedSchedule[0]);
    } catch (error) {
        console.error("Error updating schedule:", error);
        return NextResponse.json(
            { error: "Failed to update schedule" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Schedule ID is required" },
                { status: 400 }
            );
        }

        const deletedSchedule = await db
            .delete(schedules)
            .where(eq(schedules.id, Number(id)))
            .returning();

        if (deletedSchedule.length === 0) {
            return NextResponse.json(
                { error: "Schedule not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, deleted: deletedSchedule[0] });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        return NextResponse.json(
            { error: "Failed to delete schedule" },
            { status: 500 }
        );
    }
}
