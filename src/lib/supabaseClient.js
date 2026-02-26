import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


const customStorage = {
  getItem: (key) =>
    localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    if (sessionStorage.getItem(key) !== null) {
      sessionStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
