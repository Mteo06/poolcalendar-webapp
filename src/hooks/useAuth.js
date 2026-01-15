import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmed, setEmailConfirmed] = useState(true);

  useEffect(() => {
    let mounted = true;
    let sessionCheckTimeout = null;

    const initAuth = async () => {
      try {
        // Timeout per evitare loop infiniti
        sessionCheckTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Session check timeout - forcing complete');
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (sessionCheckTimeout) {
          clearTimeout(sessionCheckTimeout);
        }

        if (error) {
          console.error('Session error:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id, mounted);
          } else {
            if (mounted) setLoading(false);
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error('Init auth error:', err);
        if (sessionCheckTimeout) {
          clearTimeout(sessionCheckTimeout);
        }
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (!mounted) return;

        // Ignora eventi INITIAL_SESSION per evitare doppi caricamenti
        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id, mounted);
          } else {
            if (mounted) setLoading(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setEmailConfirmed(true);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId, mounted = true) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Usa maybeSingle invece di single per evitare errori

      if (!mounted) return;

      if (data) {
        setProfile(data);
      } else if (error) {
        console.error('Error loading profile:', error);
        // Crea profilo solo se l'errore è "not found"
        if (error.code === 'PGRST116') {
          await createProfile(userId, mounted);
        }
      } else {
        // Nessun dato e nessun errore = profilo non esiste
        await createProfile(userId, mounted);
      }
    } catch (err) {
      console.error('Exception loading profile:', err);
      if (mounted) {
        // Crea profilo di fallback
        await createProfile(userId, mounted);
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const createProfile = async (userId, mounted = true) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !mounted) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'utente',
          email: currentUser?.email || '',
          name: '',
          surname: ''
        }])
        .select()
        .maybeSingle();

      if (!mounted) return;

      if (data) {
        setProfile(data);
      } else if (error) {
        console.error('Error creating profile:', error);
        // Fallback profile
        setProfile({
          id: userId,
          username: currentUser?.user_metadata?.username || 'utente',
          email: currentUser?.email || '',
          name: '',
          surname: ''
        });
      }
    } catch (err) {
      console.error('Exception creating profile:', err);
      if (mounted) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setProfile({
          id: userId,
          username: currentUser?.user_metadata?.username || 'utente',
          email: currentUser?.email || '',
          name: '',
          surname: ''
        });
      }
    }
  };

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Se rememberMe è false, forza sessione non persistente
      if (!rememberMe) {
        // Cambia la sessione da persistente a temporanea
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        // Rimuovi dai localStorage per renderla temporanea
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
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
    
    // Pulisci sia localStorage che sessionStorage
    const localKeys = Object.keys(localStorage);
    const sessionKeys = Object.keys(sessionStorage);
    
    [...localKeys, ...sessionKeys].forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    });

    setUser(null);
    setProfile(null);
    setEmailConfirmed(true);
  };

  const resendConfirmationEmail = async () => {
    if (!user?.email) return { success: false };
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateEmail = async (newEmail) => {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
    updateEmail,
    updatePassword,
    isAuthenticated: !!user && emailConfirmed
  };
};
