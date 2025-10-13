import { getServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_req: Request) {
  try {
    const { supabase, commit } = await getServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userRes = await supabase.auth.getUser();
    const res = NextResponse.json({
      session: session ?? null,
      user: userRes?.data ?? null,
    });
    // apply any cookies requested by the supabase helper
    commit(res);
    return res;
  } catch (e: any) {
    console.error("[api/debug-session] error", e);
    return new NextResponse(e?.message ?? "error", { status: 500 });
  }
}
