import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase client for frontend operations
 * Uses anon key for client-side operations (RLS policies apply)
 * Returns null if Supabase is not configured (allows graceful fallback)
 */
export const supabase: SupabaseClient | null = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.DEV) {
      console.warn(
        'Supabase not configured. Missing environment variables:\n' +
        (!supabaseUrl ? '  - VITE_SUPABASE_URL\n' : '') +
        (!supabaseAnonKey ? '  - VITE_SUPABASE_ANON_KEY\n' : '') +
        'The app will use localStorage as fallback.'
      );
    }
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
})();

export default supabase;
