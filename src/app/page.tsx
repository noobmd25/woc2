"use client";
import { toast } from 'react-hot-toast';
import SimpleHeader from '@/components/SimpleHeader';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import emailjs from '@emailjs/browser';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

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

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    emailjs
      .sendForm(
        'service_2ifo3ea',
        'template_3no0236',
        e.currentTarget,
        'xUL0MRw2j4Y5mFios'
      )
      .then(() => {
        toast.success('Access request sent successfully!');
        setShowRequestModal(false);
      })
      .catch((error) => {
        console.error('EmailJS Error:', error);
        toast.error('There was an error sending your request. Please try again.');
      });
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
          Request Access
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
                    setShowLogin(false);
                    router.push('/oncall');
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
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">Request Access</h2>
              <form className="space-y-4" onSubmit={handleEmailSubmit}>
                <input name="full_name" placeholder="Full Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input name="email" type="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input
                  name="phone"
                  placeholder="Phone Number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input name="residency" placeholder="Residency/Service" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input name="year" placeholder="Year of Training (if resident)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div className="flex flex-col text-left">
                  <label className="text-sm font-medium text-black dark:text-white mb-1">Position</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input type="radio" name="position" value="Resident" className="accent-blue-600" />
                      <span>Resident</span>
                    </label>
                    <label className="flex items-center space-x-2 text-black dark:text-white">
                      <input type="radio" name="position" value="Attending" className="accent-blue-600" />
                      <span>Attending</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Send</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
