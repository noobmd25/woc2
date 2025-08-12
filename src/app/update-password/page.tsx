'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

export default function UpdatePasswordPage() {
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const router = useRouter();

  // Wait for Supabase to establish the recovery session from the email link.
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setReady(!!session);
    }, 200);
    const { data: sub } = supabase.auth.onAuthStateChange(() => setReady(true));
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (pwd.length < 8) return setMsg('Password must be at least 8 characters.');
    if (pwd !== pwd2) return setMsg('Passwords do not match.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return setMsg(error.message);
    toast.success('Password updated! Redirecting...');
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-xl font-semibold mb-2">Set a new password</h1>
      {!ready ? (
        <p className="text-sm text-gray-600">Loading session…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={pwd2}
            onChange={e => setPwd2(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <button
            type="submit"
            disabled={busy}
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