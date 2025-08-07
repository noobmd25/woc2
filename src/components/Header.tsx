'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="z-50 bg-[#001f3f] dark:bg-[#001f3f] text-white shadow">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="text-white text-2xl focus:outline-none cursor-pointer hover:ring-2 hover:ring-white hover:rounded-md hover:opacity-80"
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="w-40 h-auto">
            <img src="/logo.svg" alt="Logo" className="w-full h-auto" />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white text-blue-600 px-4 py-1 rounded hover:ring-2 hover:ring-white hover:opacity-80"
        >
          Logout
        </button>
      </div>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden px-6 ${
          menuOpen ? 'max-h-40 opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="transition-opacity duration-500 ease-in-out">
          <nav>
            <ul className="space-y-2 pt-2">
              <li><a href="/oncall" className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md">On Call</a></li>
              <li><a href="/directory" className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md">Directory</a></li>
              <li><a href="/schedule" className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md">Scheduler</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}