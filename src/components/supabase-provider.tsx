"use client";
import { getBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

/**
 * SupabaseProvider: mounts a hidden listener to keep the auth session fresh and
 * trigger a refetch of the session on visibility changes (helps with multi-tab logout/login).
 */
export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = getBrowserClient();
    let cancelled = false;

    const refresh = async () => {
      try {
        // Use getSession instead of getUser for better session recovery
        const { error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session refresh error:", error);
          // Don't throw - let the auth flow handle it
        }

        // Mark as initialized regardless of session state
        if (!cancelled) {
          setIsInitialized(true);
        }

      } catch (error) {
        console.error("Auth refresh error:", error);
        // Silently fail - don't break the app
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    };

    // Initial refresh with a small delay to ensure proper initialization
    const timer = setTimeout(refresh, 100);

    interface AuthSession {
      user: {
        id: string;
        [key: string]: any;
      } | null;
      [key: string]: any;
    }

    type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "MFA_CHALLENGE_VERIFIED" | "MFA_VERIFIED" | "MFA_ENROLLMENT_UPDATED" | "MFA_ENROLLMENT_REMOVED" | string;

    interface AuthSubscription {
      subscription: {
        unsubscribe: () => void;
      };
    }

    const { data: authSub }: { data: AuthSubscription } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: AuthSession | null) => {
        if (!cancelled) {
          console.log(
            "Auth state changed:",
            event,
            session?.user?.id ? "user logged in" : "no user"
          );

          // Only refresh on significant auth changes, not every event
          if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            refresh();
          }
        }
      }
    );

    const onVis = () => {
      if (document.visibilityState === "visible" && !cancelled && isInitialized) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      authSub?.subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isInitialized]);

  return <>{children}</>;
}