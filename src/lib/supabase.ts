import { createClient } from '@supabase/supabase-js';

let storage;
if (typeof window !== 'undefined') {
  // Only use AsyncStorage in a browser environment
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
} else {
  // Fallback storage or handle server-side logic
  storage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
if (!supabaseUrl) {
  console.error('Supabase URL is not defined in the environment variables.');
}

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseAnonKey) {
  console.error('Supabase Anonymous key is not defined in the environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
