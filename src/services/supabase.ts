import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  );
}

/*
 * Single reusable Supabase client for the whole application.
 *
 * Security note: this uses the publishable (anon) key, which is safe to ship
 * in the frontend. Protecting the actual data is the database's job — every
 * table added later must have Supabase Row Level Security policies enabled.
 * Route guards in the React app only shape navigation; they do not secure data.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
