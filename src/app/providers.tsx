"use client";

import { AuthProvider, AuthUser } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";


const PUBLIC_PATHS = [
  "/",
  "/home",
  "/auth/login",
  "/auth/pending",
  "/auth/signup",
  "/auth/check-email",
  "/update-password",
];
const PROTECTED_REGEX = [
  /^\/oncall/,
  /^\/directory/,
  /^\/schedule/,
  /^\/admin/,
  /^\/lookup\//,
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}
function isProtectedPath(pathname: string) {
  return !isPublicPath(pathname) && PROTECTED_REGEX.some((r) => r.test(pathname));
}

export function Providers({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AuthUser | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const mountedRef = useRef(true); // Track if component is mounted


  useEffect(() => {
    if (!mountedRef.current) return; // Prevent execution if unmounted

    // If the user is authenticated and try to go to login/register, redirect to home
    if (isPublicPath(pathname) && initialUser) {
      router.push("/oncall");
      return;
    }

    if (isProtectedPath(pathname)) {
      if (!initialUser) {
        toast.error("Please sign in");
        router.push("/auth/login");
        return;
      }

      // Use status from server-provided user metadata if available
      const status = (initialUser as any)?.profile?.status as string | undefined;
      const allowedStatus = ["approved", "active"]; // adjust to your needs

      if (status && !allowedStatus.includes(status)) {
        toast.error("Your account is pending admin approval.");
        router.push("/auth/login");
        return;
      }
    }
  }, [router, initialUser, pathname]);

  useEffect(() => {
    return () => {
      mountedRef.current = false; // Cleanup on unmount
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider initialUser={initialUser}>
        <Toaster position="top-center" />
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}