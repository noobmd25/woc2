import LayoutShell from "@/components/LayoutShell";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export default async function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <LayoutShell>{children}</LayoutShell>;
}
