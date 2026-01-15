import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useShifts } from './hooks/useShifts';
import { useCompanies } from './hooks/useCompanies';
import LoginView from './components/Auth/LoginView';
import RegisterView from './components/Auth/RegisterView';
import LoadingSpinner from './components/Common/LoadingSpinner';
import CalendarView from './components/Calendar/CalendarView';
import SummaryView from './components/Summary/SummaryView';
import ProfileView from './components/Profile/ProfileView';
import Navigation from './components/Navigation/Navigation';
import './App.css';

function App() {
  console.log('🚀 App rendering...');
  
  const auth = useAuth();
  console.log('✅ Auth loaded:', { 
    loading: auth.loading, 
    isAuthenticated: auth.isAuthenticated,
    user: auth.user?.email 
  });

  const shifts = useShifts(auth.user?.id);
  console.log('✅ Shifts loaded:', { 
    loading: shifts.loading, 
    count: shifts.shifts.length 
  });

  const companies = useCompanies(auth.user?.id);
  console.log('✅ Companies loaded:', { 
    loading: companies.loading, 
    count: companies.companies.length 
  });

  const [showRegister, setShowRegister] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [activeView, setActiveView] = useState('calendar');

  useEffect(() => {
    console.log('📊 Auth state changed:', {
      loading: auth.loading,
      user: auth.user,
      profile: auth.profile,
      emailConfirmed: auth.emailConfirmed,
      isAuthenticated: auth.isAuthenticated
    });
  }, [auth.loading, auth.user, auth.profile, auth.emailConfirmed, auth.isAuthenticated]);

  const handleResendEmail = async () => {
    const result = await auth.resendConfirmationEmail();
    if (result.success) {
      setResendMessage('Email di conferma inviata!');
    } else {
      setResendMessage('Errore nell\'invio dell\'email');
    }
    setTimeout(() => setResendMessage(''), 3000);
  };

  console.log('🔍 Rendering decision - Loading:', auth.loading);

  // Loading
  if (auth.loading) {
    console.log('⏳ Showing LoadingSpinner');
    return <LoadingSpinner />;
  }

  console.log('🔍 Email confirmed:', auth.emailConfirmed);

  // Email non confermata
  if (auth.user && !auth.emailConfirmed) {
    console.log('📧 Showing email confirmation');
    return (
      <div className="pending-container">
        <div className="pending-card">
          <h1>📧 Conferma la tua email</h1>
          <div className="email-confirm-message">
            <p>Abbiamo inviato un'email di conferma a:</p>
            <p className="email-highlight">{auth.user.email}</p>
            <p>Clicca sul link nell'email per attivare il tuo account.</p>
            <p className="note">Dopo aver confermato, ricarica questa pagina.</p>
          </div>
          <button className="resend-btn" onClick={handleResendEmail}>
            Reinvia email di conferma
          </button>
          {resendMessage && <p className="auth-success">{resendMessage}</p>}
        </div>
      </div>
    );
  }

  console.log('🔍 Is authenticated:', auth.isAuthenticated);

  // Non autenticato
  if (!auth.isAuthenticated) {
    console.log('🔐 Showing login/register');
    return showRegister ? (
      <RegisterView 
        onRegister={auth.signUp}
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <LoginView 
        onLogin={auth.signIn}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  // Autenticato - mostra app principale
  console.log('🎉 Showing main app - Active view:', activeView);
  
  try {
    return (
      <div className="app-container">
        <Navigation activeView={activeView} onNavigate={setActiveView} />
        
        <main className="main-content">
          {activeView === 'calendar' && (
            <>
              {console.log('📅 Rendering CalendarView')}
              <CalendarView 
                shifts={shifts}
                companies={companies}
                profile={auth.profile}
              />
            </>
          )}
          
          {activeView === 'summary' && (
            <>
              {console.log('💰 Rendering SummaryView')}
              <SummaryView 
                shifts={shifts}
                companies={companies}
                profile={auth.profile}
              />
            </>
          )}
          
          {activeView === 'profile' && (
            <>
              {console.log('👤 Rendering ProfileView')}
              <ProfileView 
                user={auth.user}
                profile={auth.profile}
                companies={companies}
                onSignOut={auth.signOut}
              />
            </>
          )}
        </main>
      </div>
    );
  } catch (error) {
    console.error('💥 Error rendering main app:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Errore</h1>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}

export default App;
