'use client';
import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

export type Role = 'admin' | 'scheduler' | 'viewer';

/**
 * useUserRole: returns the caller's role (or null while resolving)
 * Values: 'admin' | 'scheduler' | 'viewer' | null
 */
export default function useUserRole() {
  const [role, setRole] = useState<Role | null>(null);
  const supabase = getBrowserClient();

  useEffect(() => {
    let mounted = true;

    const fetchRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) {
          if (mounted) setRole(null);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single();

        if (error) {
          if (mounted) setRole('viewer');
          return;
        }

        const r = (data?.role as Role | undefined) ?? 'viewer';
        if (mounted) setRole(r);
      } catch {
        if (mounted) setRole('viewer');
      }
    };

    fetchRole();
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchRole());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  return role;
}