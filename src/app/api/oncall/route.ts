import { db } from "@/db";
import { directory, schedules } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/oncall
 * Get on-call provider data with phone numbers
 * Query parameters:
 * - date: on_call_date (required)
 * - specialty: specialty filter (required)
 * - plan: healthcare_plan filter (optional)
 * - includeSecondPhone: whether to fetch second phone (optional, default: false)
 * - secondPhonePref: preference for second phone (pa, residency, auto)
 * - includeCover: whether to fetch cover provider phone (optional, default: false)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const specialty = searchParams.get("specialty");
        const plan = searchParams.get("plan");
        const includeSecondPhone = searchParams.get("includeSecondPhone") === "true";
        const secondPhonePref = searchParams.get("secondPhonePref") || "auto";
        const includeCover = searchParams.get("includeCover") === "true";

        if (!date || !specialty) {
            return NextResponse.json(
                { error: "Missing required parameters: date and specialty" },
                { status: 400 }
            );
        }

        // Build query conditions
        const conditions = [
            eq(schedules.onCallDate, date),
            eq(schedules.specialty, specialty),
        ];

        // Add healthcare plan condition
        if (plan) {
            conditions.push(eq(schedules.healthcarePlan, plan));
        } else {
            conditions.push(isNull(schedules.healthcarePlan));
        }

        // Fetch schedule
        const scheduleData = await db
            .select()
            .from(schedules)
            .where(and(...conditions));

        if (!scheduleData || scheduleData.length === 0) {
            return NextResponse.json(
                { data: null, message: "No provider found for this date and specialty" },
                { status: 404 }
            );
        }

        const record = scheduleData[0];

        // Get provider phone from directory
        const directoryData = await db
            .select({ phoneNumber: directory.phoneNumber })
            .from(directory)
            .where(eq(directory.providerName, record.providerName || ""));

        const phoneNumber = directoryData[0]?.phoneNumber || null;

        // Get second phone if enabled
        let secondPhone = null;
        let secondPhoneSource: string | null = null;
        if (includeSecondPhone) {
            const pref = secondPhonePref;

            // Try PA Phone first
            if (pref === "pa" || pref === "auto") {
                const paData = await db
                    .select({ phoneNumber: directory.phoneNumber })
                    .from(directory)
                    .where(
                        and(
                            ilike(directory.providerName, "%PA Phone%"),
                            eq(directory.specialty, specialty)
                        )
                    );

                if (paData[0]?.phoneNumber) {
                    secondPhone = paData[0].phoneNumber;
                    secondPhoneSource = "PA Phone";
                }
            }

            // Try Residency if PA not found
            if (!secondPhone && (pref === "residency" || pref === "auto")) {
                const resData = await db
                    .select({ phoneNumber: directory.phoneNumber })
                    .from(directory)
                    .where(
                        and(
                            ilike(directory.providerName, "%Residency%"),
                            eq(directory.specialty, specialty)
                        )
                    );

                if (resData[0]?.phoneNumber) {
                    secondPhone = resData[0].phoneNumber;
                    secondPhoneSource = "Residency";
                }
            }
        }

        // Get cover provider phone if enabled
        let coverPhone: string | null = null;
        let coverProviderName: string | null = null;
        if (includeCover && record.cover && record.coveringProvider) {
            const coverData = await db
                .select({ phoneNumber: directory.phoneNumber })
                .from(directory)
                .where(eq(directory.providerName, record.coveringProvider));

            if (coverData[0]?.phoneNumber) {
                coverPhone = coverData[0].phoneNumber;
                coverProviderName = record.coveringProvider;
            }
        }

        // Return combined data
        const response = {
            ...record,
            phone_number: phoneNumber,
            second_phone: secondPhone,
            _second_phone_source: secondPhoneSource,
            cover_phone: coverPhone,
            cover_provider_name: coverProviderName,
        };

        return NextResponse.json({ data: response });
    } catch (error) {
        console.error("Error fetching on-call data:", error);
        return NextResponse.json(
            { error: "Failed to fetch on-call data" },
            { status: 500 }
        );
    }
}
