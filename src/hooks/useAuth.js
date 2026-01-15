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

    const loadProfile = async (userId) => {
      console.log('🔵 START loadProfile for:', userId);

      try {
        const { data, error, status } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        console.log('🔵 Query result:', { data, error, status });

        if (data) {
          setSafeState(setProfile, data);
        } else if (error) {
          if (status === 406 || (error.details && error.details.includes('Results contain 0 rows'))) {
            console.log('⚠️ Profile not found, creating...');
            await createProfile(userId);
            return; // createProfile chiama già setLoading(false)
          } else {
            console.error('❌ Error loading profile:', error);
          }
        } else {
          console.warn('⚠️ loadProfile: no data, no error');
        }
      } catch (err) {
        console.error('💥 Exception in loadProfile:', err);
      } finally {
        setSafeState(setLoading, false);
        console.log('🔵 END loadProfile, loading = false');
      }
    };

    const createProfile = async (userId) => {
      console.log('🟢 START createProfile for:', userId);

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        const newProfile = {
          id: userId,
          username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'utente',
          email: currentUser?.email || '',
          name: '',
          surname: ''
        };

        console.log('🟢 Inserting profile:', newProfile);

        const { data, error } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();

        if (data) {
          setSafeState(setProfile, data);
          console.log('✅ Profile created');
        } else if (error) {
          console.error('❌ Error creating profile:', error);
        }
      } catch (err) {
        console.error('💥 Exception in createProfile:', err);
      } finally {
        setSafeState(setLoading, false);
        console.log('🟢 END createProfile, loading = false');
      }
    };

    const initAuth = async () => {
      try {
        console.log('🟡 START initAuth');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🟡 Session:', session?.user?.email);

        if (!mounted) return;

        if (session?.user) {
          setSafeState(setUser, session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setSafeState(setEmailConfirmed, confirmed);

          if (confirmed) {
            await loadProfile(session.user.id);
          } else {
            setSafeState(setLoading, false);
          }
        } else {
          setSafeState(setLoading, false);
        }
      } catch (err) {
        console.error('❌ Init auth error:', err);
        setSafeState(setLoading, false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🟡 Auth event:', event);

        if (!mounted) return;

        if (session?.user) {
          setSafeState(setUser, session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setSafeState(setEmailConfirmed, confirmed);

          if (confirmed) {
            await loadProfile(session.user.id);
          } else {
            setSafeState(setLoading, false);
          }
        } else if (event === 'SIGNED_OUT') {
          setSafeState(setUser, null);
          setSafeState(setProfile, null);
          setSafeState(setEmailConfirmed, true);
          setSafeState(setLoading, false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- Funzioni Auth ---
  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin
        }
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
    isAuthenticated: !!user && emailConfirmed
  };
};