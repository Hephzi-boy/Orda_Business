import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useSubscription(user: User | null) {
  const [plan, setPlan] = useState<string | null>(null);
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPlan = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, upload_limit')
        .eq('business_id', user.id)
        .single();

      if (!error && data) {
        setPlan(data.plan);
        setUploadLimit(data.upload_limit);
      }
      setLoading(false);
    };

    fetchPlan();
  }, [user]);

  return { plan, uploadLimit, loading };
}
