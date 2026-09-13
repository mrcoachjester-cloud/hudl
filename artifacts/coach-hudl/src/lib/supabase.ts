import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] URL configured:', !!supabaseUrl);
console.log('[Supabase] Key configured:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing credentials - app will work with demo data only');
  console.warn('[Supabase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment');
  (window as any).__debug?.errors?.push('Missing Supabase env vars');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
