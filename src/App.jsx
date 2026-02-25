import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginView from './components/Auth/LoginView';
import RegisterView from './components/Auth/RegisterView';
import ResetPasswordView from './components/Auth/ResetPasswordView';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Navigation from './components/Navigation/Navigation';
import CalendarView from './components/Calendar/CalendarView';
import SummaryView from './components/Summary/SummaryView';
import ProfileView from './components/Profile/ProfileView';
import CoordinatorDashboard from './views/coordinator/CoordinatorDashboard';
import SecretaryDashboard from './views/secretary/SecretaryDashboard';
import './App.css';

function App() {
  const [session,    setSession]    = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [authView,   setAuthView]   = useState('login');
  const [activeView, setActiveView] = useState('calendar');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Errore profilo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => await supabase.auth.signOut();

  if (loading) return <LoadingSpinner />;

  if (!session) {
    if (authView === 'register') return <RegisterView onSwitchToLogin={() => setAuthView('login')} />;
    if (authView === 'reset')    return <ResetPasswordView onSwitchToLogin={() => setAuthView('login')} />;
    return (
      <LoginView
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToReset={() => setAuthView('reset')}
      />
    );
  }

  if (profile?.role === 'coordinator') return (
    <ErrorBoundary>
      <CoordinatorDashboard user={session.user} profile={profile} onSignOut={handleSignOut} />
    </ErrorBoundary>
  );

  if (profile?.role === 'secretary') return (
    <ErrorBoundary>
      <SecretaryDashboard user={session.user} profile={profile} onSignOut={handleSignOut} />
    </ErrorBoundary>
  );

  const renderView = () => {
    switch (activeView) {
      case 'calendar': return <CalendarView user={session.user} profile={profile} />;
      case 'summary':  return <SummaryView  user={session.user} profile={profile} />;
      case 'profile':  return <ProfileView  user={session.user} profile={profile} onSignOut={handleSignOut} />;
      default:         return <CalendarView user={session.user} profile={profile} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <Navigation activeView={activeView} onNavigate={setActiveView} />
        <main className="main-content">{renderView()}</main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
