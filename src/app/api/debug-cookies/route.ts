import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const all = cookieStore
      .getAll()
      .map((c: any) => ({ name: c.name, value: c.value }));
    return NextResponse.json({ cookies: all });
  } catch (e: any) {
    console.error("[api/debug-cookies] error", e);
    return new NextResponse(e?.message ?? "error", { status: 500 });
  }
}
