'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!cancelled && (error || !data?.session)) {
          const isPublic = window.location.pathname === '/';
          if (!isPublic) {
            await supabase.auth.signOut({ scope: 'local' });
            toast.error('Your session expired. Please sign in again.');
            window.location.href = '/';
          }
        }
      } catch {
        if (!cancelled) {
          const isPublic = window.location.pathname === '/';
          if (!isPublic) {
            await supabase.auth.signOut({ scope: 'local' });
            toast.error('Your session expired. Please sign in again.');
            window.location.href = '/';
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Toaster />
      {children}
    </>
  );
}