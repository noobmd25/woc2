// src/lib/access.ts
import { getServerSupabase } from "@/lib/supabaseServer";

export async function getUserAndProfile() {
  const supabase = await getServerSupabase(); // <-- await
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role, full_name, denial_reason")
    .eq("id", user.id)
    .single();

  return { user, profile };
}