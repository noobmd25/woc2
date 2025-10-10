'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getBrowserClient } from '@/lib/supabase/client';
const supabase = getBrowserClient();

export default function UpdatePasswordPage() {
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;
  const strong = policy.test(pwd);
  const mismatch = pwd.length > 0 && pwd2.length > 0 && pwd !== pwd2;
  const router = useRouter();

  // Establish a recovery session from the email link tokens.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(url.search.replace(/^\?/, ''));

        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = queryParams.get('code') || hashParams.get('code');

        if (code && (!access_token || !refresh_token)) {
          // Handle PKCE/code flow just in case
          try { await supabase.auth.exchangeCodeForSession(code); } catch {}
        } else if (access_token && refresh_token) {
          try { await supabase.auth.setSession({ access_token, refresh_token }); } catch {}
        }

        // Clean tokens from the URL
        try {
          const cleanUrl = `${url.origin}${url.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setReady(!!session);
      } catch {
        if (mounted) setReady(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      setReady(true);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!policy.test(pwd))
      return setMsg('Password must contain uppercase, lowercase, number, and special character, and be at least 8 characters long.');
    if (pwd !== pwd2)
      return setMsg('Passwords do not match.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return setMsg(error.message);
    toast.success('Password updated! Redirecting...');
    localStorage.setItem('openSignInModal', 'true');
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  };
  
  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-xl font-semibold mb-2">Set a new password</h1>
      {!ready ? (
        <p className="text-sm text-gray-600">Loading session…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            New password
            <input
              type="password"
              placeholder="New password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              className="w-full rounded border px-3 py-2 mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Confirm password
            <input
              type="password"
              placeholder="Confirm password"
              value={pwd2}
              onChange={e => setPwd2(e.target.value)}
              className="w-full rounded border px-3 py-2 mt-1"
            />
          </label>
          <div className="text-sm space-y-1">
            {!strong && pwd.length > 0 && (
              <p className="text-rose-600">Password must have uppercase, lowercase, number, and special character, at least 8 characters.</p>
            )}
            {mismatch && <p className="text-rose-600">Passwords do not match.</p>}
          </div>
          <button
            type="submit"
            disabled={!ready || busy || !strong || pwd !== pwd2}
            className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Update password'}
          </button>
          {msg && <p className="text-sm mt-2">{msg}</p>}
        </form> 
      )}

    </div>
  );
}