import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // ✅ v1 method to get user
      const user = supabase.auth.user();

      if (!user) {
        setError("No logged-in user.");
        setLoading(false);
        return;
      }

      // ✅ Fetch profile from 'users' table
      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // allows null if not found

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  return { profile, loading, error };
};
