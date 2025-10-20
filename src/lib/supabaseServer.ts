import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-only Supabase client.
 * NOTE: On your Next version, `cookies()` is async -> we await it.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies(); // <-- fix: await

  // Use the service role key to avoid exposing elevated privileges to the client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    // Fallback to anon key for local development if service key not provided
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            options: {} // Options will be handled by Supabase when setting
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  // Step 3: Verify authentication/session if needed
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) {
  //   // Handle unauthenticated state
  // }

  return supabase;
}
