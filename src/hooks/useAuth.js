import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmed, setEmailConfirmed] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id);
          }
        }
        
        if (mounted) setLoading(false);
      } catch (err) {
        console.error('Init auth error:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setEmailConfirmed(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else if (error && error.code === 'PGRST116') {
        // Profilo non trovato, crealo
        await createProfile(userId);
      } else if (error) {
        console.error('Error loading profile:', error);
      }
    } catch (err) {
      console.error('Exception loading profile:', err);
    }
  };

  const createProfile = async (userId) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
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
        .single();

      if (data) {
        setProfile(data);
      } else if (error) {
        console.error('Error creating profile:', error);
      }
    } catch (err) {
      console.error('Exception creating profile:', err);
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

      if (!rememberMe) {
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
