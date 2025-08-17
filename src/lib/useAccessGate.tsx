

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type GateStatus = 'checking' | 'unauth' | 'pending' | 'approved' | 'denied' | 'forbidden';

type UserRole = 'viewer' | 'scheduler' | 'admin';

/**
 * Client-side access gate for pages/components.
 *
 * RLS remains the real security boundary; this hook is for UX routing.
 */
export function useAccessGate(opts: {
  requireApproved?: boolean;               // default true
  requireRoles?: UserRole[];               // e.g., ['admin'] or ['admin','scheduler']
  openLoginModal?: () => void;             // optional: open local sign-in modal
  nextPath?: string;                       // where to return after login, default current path
} = {}) {
  const router = useRouter();
  const {
    requireApproved = true,
    requireRoles,
    openLoginModal,
    nextPath,
  } = opts;

  const [status, setStatus] = useState<GateStatus>('checking');
  const [profile, setProfile] = useState<any>(null);

  const check = useCallback(async () => {
    setStatus('checking');

    // Ensure client has freshest session
    await supabase.auth.getSession();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus('unauth');
      if (openLoginModal) {
        openLoginModal();
      } else {
        const next = nextPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
        router.replace(`/?showSignIn=true&next=${encodeURIComponent(next)}`);
      }
      return;
    }

    const { data: p, error } = await supabase
      .from('profiles')
      .select('id, role, status, denial_reason, full_name, email')
      .eq('id', user.id)
      .single();

    if (error) {
      // Can't read profile due to RLS/timing—treat as pending
      setStatus('pending');
      router.replace('/auth/pending');
      return;
    }

    setProfile(p);

    if (requireApproved && p?.status !== 'approved') {
      setStatus(p?.status === 'denied' ? 'denied' : 'pending');
      router.replace('/auth/pending');
      return;
    }

    if (requireRoles && requireRoles.length > 0) {
      const ok = requireRoles.includes(p?.role);
      if (!ok) {
        setStatus('forbidden');
        // Fallback: send non-authorized users to oncall
        router.replace('/oncall');
        return;
      }
    }

    setStatus('approved');
  }, [router, openLoginModal, requireApproved, requireRoles, nextPath]);

  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      await supabase.auth.getSession();
      check();
    });
    return () => { sub?.subscription?.unsubscribe(); };
  }, [check]);

  return { status, profile, refresh: check };
}