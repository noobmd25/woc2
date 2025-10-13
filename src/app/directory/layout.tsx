import LayoutShell from "@/components/LayoutShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
