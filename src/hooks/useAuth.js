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
      const usernameFromMeta = meta.username || currentUser?.email?.split('@')[0] || 'utente';

      // Prima prova a fare upsert senza sovrascrivere role se esiste
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id:         userId,
          email:      currentUser?.email,
          username:   usernameFromMeta,
          full_name:  meta.full_name  || '',
          phone:      meta.phone      || null,
          birth_date: meta.birth_date || null,
          role:       meta.role       || 'worker',
        }, {
          onConflict: 'id',
          ignoreDuplicates: true  // ← non sovrascrive se esiste già
        })
        .select('id, username, full_name, phone, birth_date, role, email')
        .single();

      if (data) {
        setSafeState(setProfile, data);
      } else {
        // Prova solo a leggere — potrebbe già esistere
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id, username, full_name, phone, birth_date, role, email')
          .eq('id', userId)
          .single();
        if (existing) setSafeState(setProfile, existing);
      }
    } catch (err) {
      console.error('Errore createProfile:', err);
    }
  };


    const fetchProfile = async (userId) => {
      try {
        const { data, error, status } = await supabase
          .from('user_profiles')
          .select('id, username, full_name, phone, birth_date, role') // ← role incluso
          .eq('id', userId)
          .single();

        if (data) {
          setSafeState(setProfile, data);
        } else if (error) {
          if (status === 406 || error.details?.includes('0 rows')) {
            await createProfile(userId);
            return;
          } else {
            console.error('Errore caricamento profilo:', error);
          }
        }
      } catch (err) {
        console.error('Eccezione in fetchProfile:', err);
      } finally {
        setSafeState(setLoading, false);
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
            fetchProfile(session.user.id);
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

      if (session?.user) {
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
