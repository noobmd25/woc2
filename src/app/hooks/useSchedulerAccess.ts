// app/hooks/useSchedulerAccess.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function useSchedulerAccess() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in.");
        setHasAccess(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('provider_type')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        toast.error("Profile not found.");
        setHasAccess(false);
        return;
      }

      if (profile.provider_type === 'scheduler' || profile.provider_type === 'admin') {
        setHasAccess(true);
      } else {
        toast.error("You don't have access to modify schedules.");
        setHasAccess(false);
      }
    };

    checkAccess();
  }, []);

  return hasAccess;
}