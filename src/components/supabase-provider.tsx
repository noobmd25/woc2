"use client";
import { getBrowserClient } from "@/lib/supabase/client";
import { useEffect } from "react";

/**
 * SupabaseProvider: mounts a hidden listener to keep the auth session fresh and
 * trigger a refetch of the session on visibility changes (helps with multi-tab logout/login).
 */
export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    const refresh = async () => {
      try {
        await supabase.auth.getSession();
      } catch {}
    };

    // Initial refresh
    refresh();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) refresh();
    });

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      authSub?.subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <>{children}</>;
}
