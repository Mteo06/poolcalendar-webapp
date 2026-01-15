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
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
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
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
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
          setUser(null);
          setProfile(null);
          setEmailConfirmed(true);
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId, mounted = true) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted) return;

      if (data) {
        setProfile(data);
      } else if (error && error.code === 'PGRST116') {
        // Profilo non trovato, crealo
        await createProfile(userId, mounted);
      } else {
        console.error('Error loading profile:', error);
      }
    } catch (err) {
      console.error('Exception loading profile:', err);
    } finally {
      if (mounted) setLoading(false);
    }
  };

 
const createProfile = async (userId, mounted = true) => {
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

    if (!mounted) return;

    if (data) {
      setProfile(data);
    } else if (error) {
      console.error('Error creating profile:', error);
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

      // Gestisci la persistenza della sessione
      if (!rememberMe) {
        // Sessione solo per questa tab
        localStorage.removeItem('supabase.auth.token');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
