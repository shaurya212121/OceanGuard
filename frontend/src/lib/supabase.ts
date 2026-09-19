import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

// Prevent "Uncaught Error: supabaseUrl is required" when running in standalone or local mode
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default supabase;
