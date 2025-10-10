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
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRole(null); return; }
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!error && data) setRole(data.role || null);
      } catch {
        setRole(null);
      }
    };

    fetchRole();
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchRole());
    return () => { sub.subscription.unsubscribe(); };
  }, [supabase]);

  return role;
}