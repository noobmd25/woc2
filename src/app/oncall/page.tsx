import { getUserAndProfile } from "@/lib/access";
import { redirect } from "next/navigation";
import OnCallViewer from "@/components/OnCallViewer";

export default async function OnCallPage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/?showSignIn=true");
  }
  if (!profile || profile.status !== "approved") {
    redirect("/unauthorized");
  }

  return <OnCallViewer />;
}
