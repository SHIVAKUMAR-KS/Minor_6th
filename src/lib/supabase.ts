import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug environment variables
console.log('Environment Variables Check:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not Set');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Not Set');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

const getSupabaseClient = () => {
  try {
    if (typeof window === 'undefined') {
      // Server-side - don't use AsyncStorage
      return createClient(supabaseUrl, supabaseAnonKey);
    }

    // Client-side - use AsyncStorage
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Return a basic client as fallback
    return createClient(supabaseUrl, supabaseAnonKey);
  }
};

export const supabase = getSupabaseClient();
