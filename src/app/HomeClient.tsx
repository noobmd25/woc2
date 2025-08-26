'use client';

import { toast } from 'react-hot-toast';
import SimpleHeader from '@/components/SimpleHeader';
import React, { useEffect, useState } from 'react';
import ForgotPassword from '@/components/auth/ForgotPasswordModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

export default function HomeClient() {
  const supabase = getBrowserClient();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [position, setPosition] = useState<'Resident' | 'Attending' | ''>('');
  const [pgyYear, setPgyYear] = useState<string>('1');
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const search = useSearchParams();
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('openSignInModal') === 'true') {
      localStorage.removeItem('openSignInModal');
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (search?.get('showSignIn') === 'true') {
      setShowLogin(true);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('showSignIn');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [search]);

  useEffect(() => {
    // mark mounted to avoid rendering window-dependent UI on server
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    }
  }, []);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return digits;
    const [, area, prefix, line] = match;
    return [
      area ? `(${area}` : '',
      area && prefix ? `) ${prefix}` : '',
      prefix && line ? `-${line}` : '',
    ].join('');
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const full_name = String(formData.get('full_name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const chosenPosition = String(formData.get('position') || position || '').trim();
    const specialtyAttending = String(formData.get('specialty_attending') || '').trim();
    const specialtyResident = String(formData.get('specialty_resident') || '').trim();
    const pgy = String(formData.get('pgy_year') || pgyYear || '').trim();
    const password = String(formData.get('password') || '');
    const confirm = String(formData.get('confirm_password') || '');

    if (!full_name || !email) { toast.error('Name and email are required'); return; }
    if (!chosenPosition) { toast.error('Please select a position'); return; }

    let provider_type = chosenPosition;
    let department = '';
    let year_of_training = '';

    if (chosenPosition === 'Attending') {
      if (!specialtyAttending) { toast.error('Please enter your service/department'); return; }
      department = specialtyAttending;
    } else if (chosenPosition === 'Resident') {
      if (!specialtyResident) { toast.error('Please enter your residency specialty'); return; }
      if (!pgy || !/^[1-7]$/.test(pgy)) { toast.error('Please select your PGY year (1-7)'); return; }
      department = specialtyResident;
      year_of_training = `PGY-${pgy}`;
    }

    // Require user-defined password (no auto-login until approval)
    if (!password || password.length < 12) { toast.error('Password must be at least 12 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      toast.error('Password must include upper, lower, number');
      return;
    }

    try {
      const origin = (typeof window !== 'undefined' && window.location.origin)
        || process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/pending`,
          data: {
            full_name,
            department,
            provider_type,
            phone,
            year_of_training,
            requested_role: 'viewer',
            status: 'pending', // custom metadata for quick checks (profile table authoritative)
          },
        },
      });

      if (error) {
        toast.error(error.message || 'Could not create account');
        try { await supabase.from('signup_errors').insert({ email, error_text: error.message || String(error), context: { full_name, provider_type, department, year_of_training } }); } catch {}
        return;
      }

      // Ensure no active session until approval: sign out (Supabase may return session if email confirmation disabled)
      try { await supabase.auth.signOut(); } catch {}

      toast.success('Account created. Await admin approval before logging in.');
      router.push('/auth/pending');
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error during sign up');
      try { await supabase.from('signup_errors').insert({ email: String(formData.get('email')||''), error_text: e?.message || String(e), context: { tag: 'unexpected' } }); } catch {}
    }
  };

  // Debug handlers (client-side only)
  const handleLogClientSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userRes = await supabase.auth.getUser();
      console.log('[debug] client session:', sessionData);
      console.log('[debug] client user:', userRes?.data ?? null);
      toast.success('Logged client session to console');
    } catch (e: any) {
      console.error('[debug] client session error', e);
      toast.error(String(e?.message ?? e));
    }
  };

  const handleCallDebugCookies = async () => {
    try {
      const res = await fetch('/api/debug-cookies');
      const json = await res.json();
      console.log('[debug] /api/debug-cookies', json);
      toast.success('/api/debug-cookies logged to console');
    } catch (e: any) {
      console.error('[debug] debug-cookies error', e);
      toast.error('debug-cookies failed');
    }
  };

  const handleCallDebugSession = async () => {
    try {
      const res = await fetch('/api/debug-session');
      const json = await res.json();
      console.log('[debug] /api/debug-session', json);
      toast.success('/api/debug-session logged to console');
    } catch (e: any) {
      console.error('[debug] debug-session error', e);
      toast.error('debug-session failed');
    }
  };

  const handleCookieSync = async () => {
    try {
      // Find a likely supabase cookie in document.cookie
      const raw = document.cookie || '';
      const pair = raw.split('; ').find(p => /(^sb:|^sb-|supabase|sb_token|supabase-auth)/i.test(p.split('=')[0]));
      if (!pair) {
        toast.error('No supabase cookie found in document.cookie');
        console.warn('[debug] document.cookie has no supabase cookie:', raw);
        return;
      }
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');

      console.log('[debug] syncing cookie to server', { name, valueSnippet: String(value).slice(0,40) });
      const resp = await fetch('/api/cookie-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value }),
      });
      const json = await resp.json();
      console.log('[debug] /api/cookie-sync', json);
      if (resp.ok) {
        toast.success('Cookie synced to server');
      } else {
        toast.error('Cookie sync failed');
      }
    } catch (e: any) {
      console.error('[debug] cookie-sync error', e);
      toast.error('cookie-sync failed');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Incorrect email or password');
      return;
    }
    // After login, verify profile status before allowing navigation
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .maybeSingle();
      const status = (profile as any)?.status || user.user_metadata?.status;
      // Adjust allowedStatus if your approved value differs (e.g., 'active')
      const allowedStatus = ['approved', 'active'];
      if (!allowedStatus.includes(status)) {
        await supabase.auth.signOut();
        toast('Your account is pending admin approval.');
        router.replace('/auth/pending');
        return;
      }
    }
    toast.success('Login successful');
    await supabase.auth.getSession();
    setShowLogin(false);
    const nextParam = search?.get('next');
    const redirectTo = nextParam && nextParam.startsWith('/') ? nextParam : '/oncall';
    if (typeof window !== 'undefined') {
      window.location.assign(redirectTo);
    } else {
      router.replace(redirectTo);
    }
  };

  return (
    <>
      <SimpleHeader />
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <h1 className="text-4xl font-bold mb-4">Welcome to Who's On Call</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300"></p>
        <button className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition" onClick={() => setShowLogin(true)}>Login</button>
        <button onClick={() => setShowRequestModal(true)} className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition">Sign Up</button>

        {/* Debug panel toggle - only show on client localhost to avoid exposing in prod and prevent SSR mismatch */}
        {/* Render a stable container server-side to avoid hydration mismatch. We keep the button in the DOM but hidden until client mount + localhost detection. */}
        <div className="mt-6" style={{ display: mounted && isLocalhost ? 'block' : 'none' }}>
          <button onClick={() => setShowDebugPanel(s => !s)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">{showDebugPanel ? 'Hide' : 'Show'} Debug Panel</button>
        </div>

        {/* Debug panel: keep stable DOM on server, hide until mounted+localhost; show contents only when visible. */}
        <div className="mt-4 p-4 w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded text-left text-sm" style={{ display: mounted && showDebugPanel && isLocalhost ? 'block' : 'none' }}>
          <div className="flex flex-col space-y-2">
            <button onClick={handleLogClientSession} className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded">Log client session</button>
            <button onClick={handleCallDebugCookies} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded">Call /api/debug-cookies</button>
            <button onClick={handleCallDebugSession} className="px-3 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded">Call /api/debug-session</button>
            <button onClick={handleCookieSync} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded">Sync supabase cookie to server</button>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Use these to inspect session/cookie state without touching admin UI.</p>
          </div>
        </div>

        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} onClick={() => setShowLogin(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Login</h2>
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <input type="email" name="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input type="password" name="password" placeholder="Password" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <p className="text-sm mt-1">
                  <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setShowForgot(true)}>Forgot your password?</button>
                </p>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowLogin(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Login</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} onClick={() => setShowRequestModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-md">
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Create Account</h2>
              <form className="space-y-4" onSubmit={handleSignupSubmit}>
                <input name="full_name" placeholder="Full Name (e.g., John Doe)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" onBlur={() => setShowPasswordFields(true)} />
                <input name="email" type="email" placeholder="Email (e.g., john.doe@example.com)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" onBlur={() => setShowPasswordFields(true)} />
                <input name="phone" placeholder="Phone Number (e.g., (787) 123-4567)" value={phoneInput} onChange={(e) => setPhoneInput(formatPhone(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                {/* Position selection */}
                <div className="flex flex-col text-left">
                  <label className="text-sm font-medium text-black dark:text-white mb-1">Position</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input type="radio" name="position" value="Resident" className="accent-blue-600" checked={position === 'Resident'} onChange={() => { setPosition('Resident'); setShowPasswordFields(true); }} />
                      <span>Resident</span>
                    </label>
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input type="radio" name="position" value="Attending" className="accent-blue-600" checked={position === 'Attending'} onChange={() => { setPosition('Attending'); setShowPasswordFields(true); }} />
                      <span>Attending</span>
                    </label>
                  </div>
                </div>
                {position === 'Attending' && (
                  <input name="specialty_attending" placeholder="Service / Department (e.g., Cardiology)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                )}
                {position === 'Resident' && (
                  <>
                    <input name="specialty_resident" placeholder="Residency Specialty (e.g., Internal Medicine)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-black dark:text-white">Year of Training</label>
                      <div className="flex items-center space-x-2">
                        <span className="text-black dark:text-white">PGY-</span>
                        <select name="pgy_year" value={pgyYear} onChange={(e) => setPgyYear(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          {Array.from({ length: 7 }, (_, i) => String(i + 1)).map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {showPasswordFields && (
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <input name="password" type="password" placeholder="Create Password (min 12 chars)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input name="confirm_password" type="password" placeholder="Confirm Password" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Password must include upper & lower case letters and a number. You cannot log in until an admin approves your account.</p>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Create Account</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showForgot && (<ForgotPassword onClose={() => setShowForgot(false)} />)}
      </main>
    </>
  );
}