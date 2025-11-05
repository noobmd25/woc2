import crypto from "crypto";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{12,}$/;

async function passwordBreached(pwd: string): Promise<boolean> {
  const hash = crypto
    .createHash("sha1")
    .update(pwd)
    .digest("hex")
    .toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await res.text();
  return text.includes(suffix);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  console.log("Signup request body:", body);

  const { email, password, full_name, department, provider_type, phone, year_of_training } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );

  console.log("Checking password policy...");
  if (!PASSWORD_POLICY.test(password)) {
    console.log("Password failed policy check");
    return NextResponse.json({ error: "Password must be at least 12 characters and contain uppercase, lowercase, numbers, and special characters." }, { status: 400 });
  }

  console.log("Checking password breach...");
  if (await passwordBreached(password)) {
    console.log("Password found in breach corpus");
    return NextResponse.json(
      { error: "This password has been compromised in a data breach. Please choose a different password." },
      { status: 400 },
    );
  }

  console.log("Calling Supabase signup...");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        department,
        provider_type,
        phone,
        year_of_training,
        requested_role: "viewer",
        status: "pending",
      },
    },
  });

  if (error) {
    console.error("Supabase signup error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log("Signup successful");
  return NextResponse.json({ ok: true });
}
