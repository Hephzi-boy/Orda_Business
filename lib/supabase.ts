import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto'; // Ensure this import is present

// Wrap the URL and Key in quotes
const supabaseUrl = 'https://nzzbeonyovixcothupgk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emJlb255b3ZpeGNvdGh1cGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMDAwMDgsImV4cCI6MjA1OTc3NjAwOH0.WDoXXhMXR0GGh6JnIbRiueBKLRbMTAd-n7SYOoKXTrE';

// Initialize Supabase client for v1
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tells Supabase Auth to refresh the session manually
// We need to handle this manually in Supabase v1.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    const session = supabase.auth.session(); // Manually check session on app active state
    if (!session) {
      // Handle session expiry or force logout
      console.log('Session expired, please log in again');
    } else {
      console.log('Session active');
    }
  }
});
