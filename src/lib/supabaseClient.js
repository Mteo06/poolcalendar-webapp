import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// DEBUG — rimuovi dopo
supabase.auth.getSession().then(({ data, error }) => {
  console.log('🔑 getSession:', data?.session?.user?.email ?? 'null', '| error:', error);
});
