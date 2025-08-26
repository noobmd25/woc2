'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

const supabase = getBrowserClient();

export default function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });
    setBusy(false);
    setMsg(error ? error.message : 'Check your email for the reset link.');
  };

  return (
  <div className="fixed inset-0 grid place-items-center bg-black/40 z-50">
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-lg
                    dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
        Reset your password
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Enter your <span className="font-medium">registered email</span>:
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 dark:border-gray-600
                     dark:focus:ring-blue-400 dark:focus:border-blue-400"
        />

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60
                       dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-blue-400"
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-100
                       focus:outline-none focus:ring-2 focus:ring-gray-300
                       dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>

      {msg && (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{msg}</p>
      )}
    </div>
  </div>
);
}