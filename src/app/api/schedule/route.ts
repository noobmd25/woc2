import { db } from "@/db"; // your Drizzle client
import { schedules } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const plan = searchParams.get("plan");
  const date = searchParams.get("date");

  if (!specialty || !date) {
    return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
  }

  // Build query
  const scheduleQuery = db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.onCallDate, date),
        eq(schedules.specialty, specialty),
        plan
          ? eq(schedules.healthcarePlan, plan)
          : isNull(schedules.healthcarePlan)
      )
    );

  const scheduleData = await scheduleQuery;

  // Optionally, fetch directory info, etc.

  return new Response(JSON.stringify({ data: scheduleData }), { status: 200 });
}