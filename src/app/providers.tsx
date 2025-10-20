"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";

import { getBrowserClient } from "@/lib/supabase/client";

const PUBLIC_PATHS = [
  "/",
  "/home",
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
  return (
    !isPublicPath(pathname) && PROTECTED_REGEX.some((r) => r.test(pathname))
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const supabase = getBrowserClient();

        // Wait for Supabase to initialize properly
        const { data: { session }, error } = await supabase.auth.getSession(); if (cancelled) return;

        const pathname = window.location.pathname;

        // Only check auth for protected paths
        if (isProtectedPath(pathname)) {
          if (error || !session?.user) {
            toast.error("Please sign in");
            router.replace("/login");
            return;
          }

          // Verify user profile status
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", session.user.id)
            .maybeSingle();

          const status = profile?.status || session.user.user_metadata?.status;
          const allowedStatus = ["approved", "active"];

          if (!allowedStatus.includes(status)) {
            await supabase.auth.signOut();
            toast("Your account is pending admin approval.");
            router.replace("/auth/pending");
            return;
          }
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (cancelled) return;

        const pathname = window.location.pathname;
        if (isProtectedPath(pathname)) {
          toast.error("Authentication error. Please sign in again.");
          router.replace("/login");
        }
      }
    };

    // Small delay to ensure client hydration
    const timer = setTimeout(initializeAuth, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]); return (
    <>
      <Toaster />
      {children}
    </>
  );
}
