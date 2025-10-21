import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getServerSupabase } from "@/lib/supabase/server";
import { and, asc, desc, eq, gt, ilike, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/users
export async function GET(req: Request) {
  try {
    const { supabase, commit } = await getServerSupabase();

    // Authenticate and authorize (admin only)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !session.user) {
      const res = new NextResponse("Unauthorized", { status: 401 });
      commit(res);
      return res;
    }

    // Use Drizzle db for profile lookup
    const profileRows = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, session.user.id));
    const profile = profileRows[0];

    if (!profile || profile.role !== "admin") {
      const res = new NextResponse("Forbidden", { status: 403 });
      commit(res);
      return res;
    }

    const url = new URL(req.url);
    const qp = url.searchParams;
    const limit = Math.min(500, Number(qp.get("limit") ?? 20));
    const page = Math.max(1, Number(qp.get("page") ?? 1));
    const cursor = qp.get("cursor");
    const rawSortBy = qp.get("sortBy") ?? "full_name";
    const sortDir = (qp.get("sortDir") ?? "asc") === "asc" ? "asc" : "desc";
    const search = (qp.get("search") ?? "").trim();

    const allowedSort: Record<string, any> = {
      full_name: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      created_at: profiles.createdAt,
      id: profiles.id,
    };
    const sortBy = allowedSort[rawSortBy] ?? profiles.fullName;

    if (cursor) {
      let lastId: string | null = null;
      try {
        const decoded = Buffer.from(cursor, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        lastId = parsed?.lastId ?? null;
      } catch {
        lastId = null;
      }

      // Build where clause
      let whereClause: any = undefined;
      if (search) {
        const like = `%${search.replace(/%/g, "\\%")}%`;
        whereClause = or(
          ilike(profiles.fullName, like),
          ilike(profiles.email, like)
        );
      }
      if (lastId) {
        const idCond = sortDir === "asc"
          ? gt(profiles.id, lastId)
          : lt(profiles.id, lastId);
        whereClause = whereClause ? and(whereClause, idCond) : idCond;
      }

      const rows = await db
        .select({
          id: profiles.id,
          email: profiles.email,
          full_name: profiles.fullName,
          role: profiles.role,
          status: profiles.status,
          created_at: profiles.createdAt,
          updated_at: profiles.updatedAt,
        })
        .from(profiles)
        .where(whereClause)
        .orderBy(sortDir === "asc" ? asc(sortBy) : desc(sortBy))
        .limit(limit + 1);

      let nextCursor: string | null = null;
      if (rows.length > limit) {
        const nextRow = rows[limit];
        nextCursor = Buffer.from(
          JSON.stringify({ lastId: nextRow.id }),
        ).toString("base64");
      }

      const pageRows = rows.slice(0, limit);

      const res = NextResponse.json({
        rows: pageRows,
        nextCursor,
        count: null,
      });
      commit(res);
      return res;
    }

    const offset = (page - 1) * limit;
    let whereClause: any = undefined;
    if (search) {
      const like = `%${search.replace(/%/g, "\\%")}%`;
      whereClause = or(
        ilike(profiles.fullName, like),
        ilike(profiles.email, like)
      );
    }

    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        full_name: profiles.fullName,
        role: profiles.role,
        status: profiles.status,
        created_at: profiles.createdAt,
        updated_at: profiles.updatedAt,
      })
      .from(profiles)
      .where(whereClause)
      .orderBy(sortDir === "asc" ? asc(sortBy) : desc(sortBy))
      .offset(offset)
      .limit(limit);

    // Get total count
    let count: number | null = null;
    try {
      const countRows = await db
        .select({ count: profiles.id })
        .from(profiles)
        .where(whereClause);
      count = countRows.length;
    } catch {
      count = null;
    }

    const res = NextResponse.json({
      rows: rows ?? [],
      nextCursor: null,
      count,
    });
    commit(res);
    return res;
  } catch (e: any) {
    console.error("[api/users] unexpected error", e);
    return new NextResponse(e?.message ?? "Internal error", { status: 500 });
  }
}
