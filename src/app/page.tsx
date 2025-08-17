"use client";
import { toast } from 'react-hot-toast';
import SimpleHeader from '@/components/SimpleHeader';

import React, { useEffect, useState } from 'react';
import ForgotPassword from '@/components/auth/ForgotPasswordModal';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';

function generateStrongPassword(len = 14) {
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const specials = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";
  const all = lowers + uppers + digits + specials;

  const randIndex = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return Math.floor((buf[0] / 2**32) * n);
  };
  const pick = (set: string) => set[randIndex(set.length)];

  // Ensure at least one from each class
  const required = [pick(lowers), pick(uppers), pick(digits), pick(specials)];

  // Fill the rest
  const remaining = Math.max(len - required.length, 0);
  const rest = Array.from({ length: remaining }, () => pick(all));

  // Shuffle (Fisher–Yates)
  const arr = [...required, ...rest];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [position, setPosition] = useState<'Resident' | 'Attending' | ''>('');
  const [pgyYear, setPgyYear] = useState<string>('1'); // 1-7 as strings
  const search = useSearchParams();

  useEffect(() => {
    // Auto-open login modal if a previous page requested it
    if (typeof window !== 'undefined' && localStorage.getItem('openSignInModal') === 'true') {
      localStorage.removeItem('openSignInModal');
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
  if (search?.get('showSignIn') === 'true') {
    setShowLogin(true);
    // Clean the URL so refreshes don't reopen it
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('showSignIn');
      window.history.replaceState({}, '', url.toString());
    }
  }
}, [search]);

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
    const chosenPosition = String(formData.get('position') || position || '').trim(); // Resident | Attending
    const specialtyAttending = String(formData.get('specialty_attending') || '').trim();
    const specialtyResident = String(formData.get('specialty_resident') || '').trim();
    const pgy = String(formData.get('pgy_year') || pgyYear || '').trim(); // '1'..'7'

    if (!full_name || !email) {
      toast.error('Name and email are required');
      return;
    }

    if (!chosenPosition) {
      toast.error('Please select a position');
      return;
    }

    let provider_type = chosenPosition;
    let department = '';
    let year_of_training = '';

    if (chosenPosition === 'Attending') {
      if (!specialtyAttending) {
        toast.error('Please enter your service/department');
        return;
      }
      department = specialtyAttending;
    } else if (chosenPosition === 'Resident') {
      if (!specialtyResident) {
        toast.error('Please enter your residency specialty');
        return;
      }
      if (!pgy || !/^[1-7]$/.test(pgy)) {
        toast.error('Please select your PGY year (1-7)');
        return;
      }
      department = specialtyResident;
      year_of_training = `PGY-${pgy}`;
    }

    try {
      const origin = (typeof window !== 'undefined' && window.location.origin)
        || process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      const password = generateStrongPassword(14);
      console.log('[signup] submitting', { email, provider_type, department, year_of_training, origin });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/pending`,
          data: {
            full_name,
            department,        // specialty/service
            provider_type,     // 'Resident' | 'Attending'
            phone,
            year_of_training,  // 'PGY-#' or ''
            requested_role: 'viewer',
          },
        },
      });

      console.log('[signup] result', { data, error });
      
      toast(`signup: ${JSON.stringify({
        user: !!data?.user,
        session: !!data?.session,
        err: error?.message ?? null,
      })}`);

      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message || 'Could not create account');
        // Best-effort: persist the error for later inspection
        try {
          await supabase.from('signup_errors').insert({
            email,
            error_text: error.message || String(error),
            context: { full_name, provider_type, department, year_of_training },
          });
        } catch (logErr) {
          console.warn('[signup] failed to log to signup_errors', logErr);
        }
        return;
      }

      // If email confirmations are ON, user/session will be null and an email is sent by Supabase
      toast.success("Account created. Check your email to confirm. You'll be approved by an admin.");
      // Nudge the server to pick up any new session (in case confirmations are OFF in local)
      await supabase.auth.getSession();
      router.push('/auth/pending');
    } catch (e: any) {
      console.error('[signup] unexpected error', e);
      toast.error(e?.message || 'Unexpected error during sign up');
      try {
        await supabase.from('signup_errors').insert({
          email,
          error_text: e?.message || String(e),
          context: { full_name, provider_type, department, year_of_training, tag: 'unexpected' },
        });
      } catch (logErr) {
        console.warn('[signup] failed to log unexpected error', logErr);
      }
      return;
    }
  };

  return (
    <>
      <SimpleHeader />
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <h1 className="text-4xl font-bold mb-4">Welcome to Who's On Call</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          
        </p>
        <button
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
          onClick={() => setShowLogin(true)}
        >
          Login
        </button>
        <button
          onClick={() => setShowRequestModal(true)}
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
        >
          Sign Up
        </button>
        {showLogin && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={() => setShowLogin(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Login</h2>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
                  const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;


                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });

                  if (error) {
                    console.error('Login error:', error.message);
                    toast.error('Incorrect email or password');
                  } else {
                    toast.success('Login successful');
                    // Ensure server sees the session before navigating
                    await supabase.auth.getSession();
                    router.refresh();
                    setShowLogin(false);
                    const nextParam = search?.get('next');
                    const redirectTo = nextParam && nextParam.startsWith('/') ? nextParam : '/oncall';
                    router.replace(redirectTo);
                  }
                }}
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm mt-1">
                  <button
                    type="button"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowForgot(true)}
                  >
                    Forgot your password?
                  </button>
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showRequestModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={() => setShowRequestModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-md"
            >
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Create Account</h2>
              <form className="space-y-4" onSubmit={handleSignupSubmit}>
                <input name="full_name" placeholder="Full Name (e.g., John Doe)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input name="email" type="email" placeholder="Email (e.g., john.doe@example.com)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input
                  name="phone"
                  placeholder="Phone Number (e.g., (787) 123-4567)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="flex flex-col text-left">
                  <label className="text-sm font-medium text-black dark:text-white mb-1">Position</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input
                        type="radio"
                        name="position"
                        value="Resident"
                        className="accent-blue-600"
                        checked={position === 'Resident'}
                        onChange={() => { setPosition('Resident'); }}
                      />
                      <span>Resident</span>
                    </label>
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input
                        type="radio"
                        name="position"
                        value="Attending"
                        className="accent-blue-600"
                        checked={position === 'Attending'}
                        onChange={() => { setPosition('Attending'); }}
                      />
                      <span>Attending</span>
                    </label>
                  </div>
                </div>

                {position === 'Attending' && (
                  <input
                    name="specialty_attending"
                    placeholder="Service / Department (e.g., Cardiology)"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                )}

                {position === 'Resident' && (
                  <>
                    <input
                      name="specialty_resident"
                      placeholder="Residency Specialty (e.g., Internal Medicine)"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-black dark:text-white">Year of Training</label>
                      <div className="flex items-center space-x-2">
                        <span className="text-black dark:text-white">PGY-</span>
                        <select
                          name="pgy_year"
                          value={pgyYear}
                          onChange={(e) => setPgyYear(e.target.value)}
                          className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          {Array.from({ length: 7 }, (_, i) => String(i + 1)).map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Create Account</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showForgot && (
          <ForgotPassword onClose={() => setShowForgot(false)} />
        )}
      </main>
    </>
  );
}
