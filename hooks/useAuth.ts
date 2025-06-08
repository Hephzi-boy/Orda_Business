// src/hooks/useAuth.ts
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial session check (Supabase v1)
    const session: Session | null = supabase.auth.session();
    setUser(session?.user ?? null);
    setIsLoading(false);

    // Listen to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
};
