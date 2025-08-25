'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/client'

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const supabase = getBrowserClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => router.refresh())
    return () => sub.subscription.unsubscribe()
  }, [router])
  return <>{children}</>
}
