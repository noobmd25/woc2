// src/lib/access.ts
import { profileQueries } from "@/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";

export async function getUserAndProfile() {
  const { supabase } = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null };

  const profile = (await profileQueries.findById(user.id))[0];

  return { user: { ...user, profile } };
  // return { user };
}
