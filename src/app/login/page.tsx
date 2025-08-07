'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SimpleHeader from '@/components/SimpleHeader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/oncall';
  };

  return (
    <>
      <SimpleHeader />
      <main className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-black">
        <div className="w-full max-w-md p-6 rounded-lg shadow-md bg-white dark:bg-gray-900">
          <h1 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-white">Who's On Call</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              required
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Login
            </button>
          </form>
          {error && <p className="mt-4 text-red-600 text-sm text-center">{error}</p>}
        </div>
      </main>
    </>
  );
}