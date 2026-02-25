import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmed, setEmailConfirmed] = useState(true);

  useEffect(() => {
    let mounted = true;

    const setSafeState = (setter, value) => {
      if (mounted) setter(value);
    };

    const createProfile = async (userId) => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const meta = currentUser?.user_metadata || {};

        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            id:         userId,
            email:      currentUser?.email,
            username:   meta.username   || currentUser?.email?.split('@')[0] || 'utente',
            full_name:  meta.full_name  || '',
            phone:      meta.phone      || null,
            birth_date: meta.birth_date || null,
            role:       meta.role       || 'worker',
          })
          .select('id, username, full_name, phone, birth_date, role, email')
          .single();

        if (data) {
          setSafeState(setProfile, data);
        } else {
          // Insert fallito → profilo già esiste, rileggi
          const { data: existing } = await supabase
            .from('user_profiles')
            .select('id, username, full_name, phone, birth_date, role, email')
            .eq('id', userId)
            .maybeSingle();
          if (existing) setSafeState(setProfile, existing);
        }
      } catch (err) {
        console.error('Errore createProfile:', err);
      } finally {
        setSafeState(setLoading, false); // ← sempre
      }
    };

    const fetchProfile = async (userId) => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, username, full_name, phone, birth_date, role, email')
          .eq('id', userId)
          .maybeSingle(); // ← non genera 406, ritorna null se non esiste

        if (data) {
          setSafeState(setProfile, data);
          setSafeState(setLoading, false);
        } else {
          // Profilo non esiste → crealo
          await createProfile(userId);
        }
      } catch (err) {
        console.error('Eccezione in fetchProfile:', err);
        setSafeState(setLoading, false); // ← sempre
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setSafeState(setUser, session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setSafeState(setEmailConfirmed, confirmed);
          if (confirmed) {
            await fetchProfile(session.user.id);
          } else {
            setSafeState(setLoading, false);
          }
        } else {
          setSafeState(setLoading, false);
        }
      } catch (err) {
        console.error('Init auth error:', err);
        setSafeState(setLoading, false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // ← Ignora INITIAL_SESSION, lo gestisce già initAuth
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN' && session?.user) {
        setSafeState(setUser, session.user);
        const confirmed = session.user.email_confirmed_at !== null;
        setSafeState(setEmailConfirmed, confirmed);
        if (confirmed) {
          fetchProfile(session.user.id);
        } else {
          setSafeState(setLoading, false);
        }
      } else if (event === 'SIGNED_OUT') {
        setSafeState(setUser, null);
        setSafeState(setProfile, null);
        setSafeState(setEmailConfirmed, true);
        setSafeState(setLoading, false);
      }
    });


    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true, data, needsEmailConfirmation: !data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password, rememberMe = false) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (!rememberMe) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            const value = localStorage.getItem(key);
            sessionStorage.setItem(key, value);
            localStorage.removeItem(key);
          }
        });
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    });
    setUser(null);
    setProfile(null);
    setEmailConfirmed(true);
    setLoading(false);
  };

  const resendConfirmationEmail = async () => {
    if (!user?.email) return { success: false };
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    profile,
    loading,
    emailConfirmed,
    signUp,
    signIn,
    signOut,
    resendConfirmationEmail,
    isAuthenticated: !!user && emailConfirmed,
  };
};
