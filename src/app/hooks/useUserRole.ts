"use client";

import { getBrowserClient } from "@/lib/supabase/client";

import { useEffect, useState } from "react";

export type Role = "admin" | "scheduler" | "viewer";

/**
 * useUserRole: returns the caller's role (or null while resolving)
 * Values: 'admin' | 'scheduler' | 'viewer' | null
 */
export default function useUserRole() {
  const [role, setRole] = useState<Role | null>(null);
  const supabase = getBrowserClient();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          return;
        }

        // Migrate database query to API route
        const response = await fetch(`/api/profiles?id=${user.id}`);

        if (!response.ok) {
          console.error("Failed to fetch user profile:", response.statusText);
          setRole(null);
          return;
        }

        const { data } = await response.json();

        if (data && data.length > 0) {
          setRole(data[0].role || null);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      }
    };

    fetchRole();
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchRole());
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return role;
}
