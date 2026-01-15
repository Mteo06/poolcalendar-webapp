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
        console.log('🟡 START initAuth');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🟡 Session:', session?.user?.email);
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            console.log('🟡 Calling loadProfile...');
            await loadProfile(session.user.id);
          } else {
            console.log('🟡 Email not confirmed, setLoading(false)');
            setLoading(false);
          }
        } else {
          console.log('🟡 No session, setLoading(false)');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Init auth error:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🟡 Auth event:', event);
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            console.log('🟡 onAuthStateChange calling loadProfile...');
            await loadProfile(session.user.id);
          } else {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setEmailConfirmed(true);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId) => {
    console.log('🔵 START loadProfile for:', userId);
    
    try {
      console.log('🔵 Executing query...');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('🔵 Query completed:', { data, error });

      if (data) {
        console.log('✅ Profile found, setting state');
        setProfile(data);
        setLoading(false); // ← IMPORTANTE
        console.log('✅ Profile state set, loading = false');
      } else if (error && error.code === 'PGRST116') {
        console.log('⚠️ Profile not found (PGRST116), creating...');
        await createProfile(userId);
      } else if (error) {
        console.error('❌ Error loading profile:', error);
        setLoading(false); // ← Anche in caso di errore
      }
    } catch (err) {
      console.error('💥 Exception in loadProfile:', err);
      setLoading(false); // ← Anche in caso di eccezione
    }
    
    console.log('🔵 END loadProfile');
  };

  const createProfile = async (userId) => {
    console.log('🟢 START createProfile for:', userId);
    
    try {
      console.log('🟢 Getting current user...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('🟢 Current user:', currentUser?.email);
      
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

      console.log('🟢 Insert result:', { data, error });

      if (data) {
        console.log('✅ Profile created, setting state');
        setProfile(data);
        setLoading(false); // ← IMPORTANTE
        console.log('✅ Profile state set, loading = false');
      } else if (error) {
        console.error('❌ Error creating profile:', error);
        setLoading(false); // ← Anche in caso di errore
      }
    } catch (err) {
      console.error('💥 Exception in createProfile:', err);
      setLoading(false); // ← Anche in caso di eccezione
    }
    
    console.log('🟢 END createProfile');
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
