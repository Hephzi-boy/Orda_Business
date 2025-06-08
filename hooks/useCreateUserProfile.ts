// hooks/useCreateUserProfile.ts
import { supabase } from '@/lib/supabase'; // Adjust path if needed
import { useEffect } from 'react';
import { Alert } from 'react-native';

export const useCreateUserProfile = () => {
  useEffect(() => {
    let isMounted = true;

    const createProfileIfNotExist = async () => {
      try {
        // ✅ Supabase v1: get current user
        const user = supabase.auth.user();

        if (!user) {
          console.warn("No authenticated user found.");
          return;
        }

        // ✅ Check if profile already exists
        const { data: existingProfile, error: selectError } = await supabase
          .from('profile')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (selectError) {
          console.error("Error checking for existing profile:", selectError.message);
          return;
        }

        // ✅ Create profile if it doesn't exist
        if (!existingProfile) {
          console.log(`Profile not found for user ${user.id}, creating...`);
          const defaultUsername = user.email?.split('@')[0] || `user_${user.id.slice(0, 6)}`;

          const { error: insertError } = await supabase
            .from('profile')
            .insert({
              id: user.id,
              username: defaultUsername,
            });

          if (insertError) {
            console.error('Failed to create profile:', insertError.message);
            if (isMounted) {
              Alert.alert('Error', 'Could not initialize user profile.');
            }
          } else {
            console.log('✅ Profile created successfully');
          }
        }

      } catch (error: any) {
        console.error("Unexpected error in createProfileIfNotExist:", error.message);
      }
    };

    createProfileIfNotExist();

    return () => {
      isMounted = false;
    };
  }, []);
};
