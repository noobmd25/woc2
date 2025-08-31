'use client';

import { useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'react-hot-toast';

const PUBLIC_PATHS = ['/', '/home', '/auth/pending', '/auth/signup', '/auth/check-email', '/update-password'];
const PROTECTED_REGEX = [/^\/oncall/, /^\/directory/, /^\/schedule/, /^\/admin/, /^\/lookup\//];

function isPublicPath(pathname: string) { return PUBLIC_PATHS.includes(pathname); }
function isProtectedPath(pathname: string) { return !isPublicPath(pathname) && PROTECTED_REGEX.some(r => r.test(pathname)); }

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const check = async (attempt = 1) => {
      const supabase = getBrowserClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        const pathname = window.location.pathname;
        if (!isProtectedPath(pathname)) return; // no gating for public
        if (!user) {
          if (attempt < 3) {
            setTimeout(() => { if (!cancelled) check(attempt + 1); }, attempt * 350);
            return;
          }
          toast.error('Please sign in');
          window.location.href = '/?showSignIn=true&next=' + encodeURIComponent(pathname);
        }
      } catch {
        if (cancelled) return;
        const pathname = window.location.pathname;
        if (!isProtectedPath(pathname)) return;
        if (attempt < 3) {
            setTimeout(() => { if (!cancelled) check(attempt + 1); }, attempt * 350);
            return;
        }
        toast.error('Please sign in');
        window.location.href = '/?showSignIn=true&next=' + encodeURIComponent(pathname);
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Toaster />
      {children}
    </>
  );
}