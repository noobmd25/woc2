'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleBodyClick = () => {
      const sidebarNav = document.getElementById('side-nav');
      if (sidebarNav?.classList.contains('open')) {
        sidebarNav.classList.remove('open');
      }
    };
    document.body.addEventListener('click', handleBodyClick);
    return () => {
      document.body.removeEventListener('click', handleBodyClick);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300">
      <Header />
      <main className="flex justify-center">
        <div className="w-full max-w-screen-lg px-4">
          {children}
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}