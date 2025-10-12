// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  const cookieGetter = () =>
    cookieStore.getAll().map((c) => ({ name: c.name, value: String(c.value) }));

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: cookieGetter,
        setAll(_cookiesToSet) {
          // intentionally no-op for simple server usage
        },
      },
    },
  );

  return client;
}

// Compatibility helper for route handlers wanting commit semantics
export async function getServerSupabase() {
  const cookieStore = await cookies();
  const cookieGetter = () =>
    cookieStore.getAll().map((c) => ({ name: c.name, value: String(c.value) }));
  let cookieSetQueue: { name: string; value: string; options: any }[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: cookieGetter,
        setAll(cookiesToSet) {
          cookieSetQueue = cookiesToSet as any;
        },
      },
    },
  );

  function commit(res: any) {
    for (const c of cookieSetQueue) {
      try {
        // next@15 cookies().set signature supports (name, value, options)
        // Some older versions used res.cookies.set; this centralizes logic.
        cookieStore.set(c.name, c.value, c.options);
      } catch (e) {
        // swallow
      }
    }
    return res;
  }

  return { supabase, commit };
}
