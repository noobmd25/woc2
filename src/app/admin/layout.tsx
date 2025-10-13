import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string) || "viewer";
  // Only allow admin now (scheduler no longer permitted)
  if (role !== "admin") {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
