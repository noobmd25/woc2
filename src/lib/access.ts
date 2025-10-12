// src/lib/access.ts
import { getServerSupabase } from "@/lib/supabase/server";

export async function getUserAndProfile() {
  const { supabase } = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || !session.user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role, full_name, denial_reason")
    .eq("id", session.user.id)
    .maybeSingle();

  return { user: session.user, profile };
}
