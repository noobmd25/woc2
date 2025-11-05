import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { email, password } = await req.json();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    );

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Supabase login error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("Login successful");
    return NextResponse.json({
        ok: true,
        session: {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
        }
    });
}