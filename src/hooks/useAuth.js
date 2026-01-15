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
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id);
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

        if (event === 'INITIAL_SESSION') {
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const confirmed = session.user.email_confirmed_at !== null;
          setEmailConfirmed(confirmed);
          
          if (confirmed) {
            await loadProfile(session.user.id);
          } else {
            if (mounted) setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
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

  const loadProfile = async (userId) => {
    try {
      console.log('Loading profile for user:', userId);

      // Prima prova a caricare il profilo esistente
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      console.log('Profile fetch result:', { data: existingProfile, error: fetchError });

      if (existingProfile && existingProfile.length > 0) {
        // Profilo trovato
        console.log('✅ Profile found:', existingProfile[0]);
        setProfile(existingProfile[0]);
        setLoading(false);
        return;
      }

      // Profilo non trovato, crealo
      console.log('⚠️ Profile not found, creating...');
      await createProfile(userId);

    } catch (err) {
      console.error('Exception loading profile:', err);
      // In caso di errore, crea comunque il profilo
      await createProfile(userId);
    }
  };

  const createProfile = async (userId) => {
    try {
      console.log('Creating profile for user:', userId);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.error('No current user found');
        setLoading(false);
        return;
      }

      const newProfile = {
        id: userId,
        username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'utente',
        email: currentUser?.email || '',
        name: '',
        surname: ''
      };

      console.log('Inserting new profile:', newProfile);

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .limit(1);

      if (error) {
        console.error('Error creating profile:', error);
        
        // Se l'errore è "già esistente", prova a ricaricarlo
        if (error.code === '23505') {
          console.log('Profile already exists, fetching...');
          const { data: retryData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .limit(1);
          
          if (retryData && retryData.length > 0) {
            setProfile(retryData[0]);
            setLoading(false);
            return;
          }
        }
        
        // Fallback: usa profilo in memoria
        console.log('Using fallback profile');
        setProfile(newProfile);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ Profile created successfully:', data[0]);
        setProfile(data[0]);
      } else {
        console.log('⚠️ No data returned, using fallback');
        setProfile(newProfile);
      }

      setLoading(false);

    } catch (err) {
      console.error('Exception creating profile:', err);
      
      // Fallback finale
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setProfile({
        id: userId,
        username: currentUser?.user_metadata?.username || 'utente',
        email: currentUser?.email || '',
        name: '',
        surname: ''
      });
      setLoading(false);
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

      // Gestione "rimani connesso"
      if (!rememberMe) {
        // Sposta la sessione da localStorage a sessionStorage
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
    
    // Pulisci storage
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
