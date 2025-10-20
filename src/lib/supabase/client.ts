"use client";
import type { Database } from "@/types/database";
import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserClient() {
  if (typeof window === "undefined") {
    // Return a simple dummy client for SSR
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('SSR not supported') }),
        signOut: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ error: new Error('SSR not supported') }),
        refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    } as any;
  }

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      throw new Error("Missing Supabase environment variables");
    }

    // Simple client configuration without problematic features
    browserClient = createBrowserClient<Database>(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}
