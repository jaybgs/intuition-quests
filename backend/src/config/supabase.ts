import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
// Using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable. Please set SUPABASE_URL in your .env file.');
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please set SUPABASE_SERVICE_ROLE_KEY in your .env file.');
}

/**
 * Supabase client for server-side operations
 * Use service role key for admin operations (bypasses RLS)
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a Supabase client with custom auth token
 * Useful for user-specific operations
 */
export const createSupabaseClient = (accessToken?: string) => {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
  });

  return client;
};

export default supabase;

