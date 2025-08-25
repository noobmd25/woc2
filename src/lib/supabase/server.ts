import { cookies, headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()
  const hdrs = await headers()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options: CookieOptions) => cookieStore.set({ name, value, ...options }),
        remove: (name, options: CookieOptions) => cookieStore.set({ name, value: '', ...options, maxAge: 0 }),
      },
      headers: { get: (k) => hdrs.get(k) ?? undefined },
    }
  )
}
