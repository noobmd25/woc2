import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function LoginRedirectPage() {
  // Central login page simply redirects to home with a flag to open the sign-in modal
  redirect("/?showSignIn=true");
}
