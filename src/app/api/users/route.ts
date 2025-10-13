import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

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

    const allowedSort: Record<string, string> = {
      full_name: "full_name",
      email: "email",
      role: "role",
      created_at: "created_at",
      id: "id",
    };
    const sortBy = allowedSort[rawSortBy] ?? "full_name";

    const selectCols =
      "id, email, full_name, role, status, created_at, updated_at";

    if (cursor) {
      let lastId: string | null = null;
      try {
        const decoded = Buffer.from(cursor, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        lastId = parsed?.lastId ?? null;
      } catch {
        lastId = null;
      }

      let q = supabase
        .from("profiles")
        .select(selectCols)
        .order(sortBy, { ascending: sortDir === "asc" })
        .limit(limit + 1);

      if (search) {
        const like = `%${search.replace(/%/g, "\\%")}%`;
        q = q.or(`full_name.ilike.${like},email.ilike.${like}`);
      }

      if (lastId) {
        if (sortDir === "asc") {
          q = q.gt("id", lastId);
        } else {
          q = q.lt("id", lastId);
        }
      }

      const { data, error } = await q;
      if (error) {
        console.error("[api/users] cursor query error", error);
        const res = new NextResponse(error.message ?? "Query failed", {
          status: 500,
        });
        commit(res);
        return res;
      }

      const rows = (data ?? []) as any[];
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

    let base = supabase
      .from("profiles")
      .select(selectCols, { count: "exact" })
      .order(sortBy, { ascending: sortDir === "asc" })
      .range(offset, offset + limit - 1);

    if (search) {
      const like = `%${search.replace(/%/g, "\\%")}%`;
      base = base.or(`full_name.ilike.${like},email.ilike.${like}`);
    }

    const { data, error, count } = await base;
    if (error) {
      console.error("[api/users] offset query error", error);
      const res = new NextResponse(error.message ?? "Query failed", {
        status: 500,
      });
      commit(res);
      return res;
    }

    const res = NextResponse.json({
      rows: data ?? [],
      nextCursor: null,
      count: typeof count === "number" ? count : null,
    });
    commit(res);
    return res;
  } catch (e: any) {
    console.error("[api/users] unexpected error", e);
    return new NextResponse(e?.message ?? "Internal error", { status: 500 });
  }
}
