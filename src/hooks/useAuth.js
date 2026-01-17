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
        console.log("Creazione profilo manuale per", userId);
    
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData?.user;
    
        const usernameFromMeta =
          currentUser?.user_metadata?.username ||
          currentUser?.email?.split("@")[0];   // fallback sensato
    
        const { data, error } = await supabase
          .from("userprofiles")
          .insert({
            id: userId,
            username: usernameFromMeta,
            email: currentUser?.email,
            name: "",
            surname: "",
          })
          .select()
          .single();
    
        if (data) {
          console.log("Profilo creato:", data);
          setProfile(data);
        } else {
          console.error("Errore creazione profilo:", error);
          // fallback comunque coerente
          setProfile({
            id: userId,
            username: usernameFromMeta,
            email: currentUser?.email,
            name: "",
            surname: "",
          });
        }
      } catch (err) {
        console.error("Errore creazione profilo:", err);
      }
    };
    

    const fetchProfile = async (userId) => {
      try {
        const { data, error, status } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data) {
          setSafeState(setProfile, data);
        } else if (error) {
          // Se profilo non esiste, crealo
          if (status === 406 || (error.details?.includes('0 rows'))) {
            await createProfile(userId);
            return;
          } else {
            console.error('❌ Error loading profile:', error);
          }
        } else {
          console.warn('⚠️ fetchProfile: no data, no error');
        }
      } catch (err) {
        console.error('💥 Exception in fetchProfile:', err);
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
            fetchProfile(session.user.id); // 🔹 senza await
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setSafeState(setUser, session.user);
        const confirmed = session.user.email_confirmed_at !== null;
        setSafeState(setEmailConfirmed, confirmed);

        if (confirmed) {
          fetchProfile(session.user.id); // 🔹 senza await
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

  // --- Funzioni Auth ---
  const signUp = async (email, password, username) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },             // <-- username finisce in user_metadata
          emailRedirectTo: window.location.origin,
        },
      });
  
      if (error) throw error;
  
      console.log("Registrazione completata", data);
      return { success: true, data, needsEmailConfirmation: !data.session };
    } catch (error) {
      console.error("Errore registrazione:", error);
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