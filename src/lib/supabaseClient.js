import { createClient } from '@supabase/supabase-js';

// TEMPORANEO - Sostituisci con le TUE chiavi da Supabase
const supabaseUrl = 'https://kgxmvgisrdssoxfhumca.supabase.co';  // ← Metti il tuo URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneG12Z2lzcmRzc294Zmh1bWNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTkxMTEsImV4cCI6MjA4NDA3NTExMX0.1yl1sCUETx2TxlalNeyMaxG9t3MOuK-B1WQetTRkIMM';  // ← Metti la tua anon key completa

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key (primi 20):', supabaseAnonKey.substring(0, 20));
console.log('🔧 Supabase configurato:', supabaseUrl && supabaseAnonKey ? 'SI' : 'NO');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});
