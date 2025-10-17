"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";

import useUserRole from "@/app/hooks/useUserRole";
import { getBrowserClient } from "@/lib/supabase/client";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const role = useUserRole();

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);

    const supabase = getBrowserClient();
    if (!supabase) {
      toast.error("Supabase client not available");
      setSigningOut(false);
      return;
    }

    const clearSupabaseAuthStorage = () => {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("sb-")) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch { }
      try {
        const cookies = document.cookie.split(";");
        cookies.forEach((raw) => {
          const name = raw.split("=")[0]?.trim();
          if (!name) return;
          if (
            name.startsWith("sb-") ||
            name.toLowerCase().startsWith("supabase")
          ) {
            document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
      } catch { }
    };

    const withTimeout = <T,>(p: Promise<T>, label: string, ms = 1500) => {
      return Promise.race([
        p,
        new Promise<T>((_r, reject) =>
          setTimeout(
            () => reject(new Error(`[timeout] ${label} after ${ms}ms`)),
            ms,
          ),
        ),
      ]);
    };

    const trySignOut = async () => {
      // @ts-ignore optional scope
      return withTimeout(
        supabase.auth.signOut({ scope: "global" }).catch(async () => {
          return supabase.auth.signOut();
        }),
        "supabase.auth.signOut()",
      );
    };

    try {
      await trySignOut();
      const sessionRes = await withTimeout(
        supabase.auth.getUser(),
        "supabase.auth.getUser()",
      );
      const user = (sessionRes as any)?.data?.user;
      if (user) {
        await trySignOut();
      }
      toast.success("Signed out");
    } catch (e: any) {
      toast.error("Could not complete sign out. Clearing session…");
    } finally {
      clearSupabaseAuthStorage();
      setMenuOpen(false);
      setSigningOut(false);
      try {
        router.replace("/");
      } catch { }
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (window.location.pathname !== "/") window.location.assign("/");
        }, 50);
      }
    }
  };

  return (
    <header className="z-50 bg-blue-600 dark:bg-[#001f3f] text-white shadow">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="text-white text-2xl focus:outline-none cursor-pointer hover:ring-2 hover:ring-white hover:rounded-md hover:opacity-80"
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <Link
            href="/"
            prefetch={false}
            className="w-40 h-auto block"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src="/logo.svg"
              alt="Logo"
              width={160}
              height={40}
              className="w-full h-auto"
            />
          </Link>
        </div>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="bg-white text-blue-600 px-4 py-1 rounded hover:ring-2 hover:ring-white hover:opacity-80 disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Logout"}
        </button>
      </div>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden px-6 ${menuOpen ? "max-h-40 opacity-100 pb-4" : "max-h-0 opacity-0"
          }`}
      >
        <div className="transition-opacity duration-500 ease-in-out">
          <nav>
            <ul className="space-y-2 pt-2">
              {/* Visible to all roles: Directory & On Call */}
              <li>
                <Link
                  href="/oncall"
                  prefetch={false}
                  className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  On Call
                </Link>
              </li>
              <li>
                <Link
                  href="/directory"
                  prefetch={false}
                  className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Directory
                </Link>
              </li>

              {/* Scheduler: visible to admin & scheduler */}
              {(role === "admin" || role === "scheduler") && (
                <li>
                  <Link
                    href="/schedule"
                    prefetch={false}
                    className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md"
                    onClick={() => setMenuOpen(false)}
                  >
                    Scheduler
                  </Link>
                </li>
              )}

              {/* Admin-only link */}
              {role === "admin" && (
                <li>
                  <Link
                    href="/admin"
                    prefetch={false}
                    className="text-white font-semibold hover:ring-2 hover:ring-white hover:rounded-md"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
