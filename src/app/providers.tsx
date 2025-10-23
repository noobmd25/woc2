"use client";

import { AuthProvider, AuthUser, useAuth } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";

const PUBLIC_PATHS = ["/", "/home", "/auth/login", "/auth/pending", "/auth/signup", "/auth/check-email", "/update-password"];
const PROTECTED_REGEX = [/^\/oncall/, /^\/directory/, /^\/schedule/, /^\/admin/, /^\/lookup\//];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}
function isProtectedPath(pathname: string) {
  return !isPublicPath(pathname) && PROTECTED_REGEX.some(r => r.test(pathname));
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // If authenticated user hits a public page, send them to the default logged‑in page
    if (isPublicPath(pathname) && user) {
      router.push("/oncall");
      return;
    }

    // If unauthenticated user hits a protected page, send them to login
    if (isProtectedPath(pathname) && !user) {
      toast.error("Please sign in");
      router.push("/auth/login");
      return;
    }

    // If user has a profile status that shouldn’t access the site
    if (isProtectedPath(pathname) && user) {
      const status = user.profile?.status;
      const allowedStatus = ["approved", "active"];
      if (status && !allowedStatus.includes(status)) {
        toast.error("Your account is pending admin approval");
        router.push("/auth/login");
      }
    }
  }, [pathname, user, isLoading, router]);

  return <>{children}</>;
}

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider initialUser={initialUser}>
        {/* Only one Toaster for your whole app */}
        <Toaster position="top-center" />
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}