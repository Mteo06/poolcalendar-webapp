import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useShifts } from './hooks/useShifts';
import { useCompanies } from './hooks/useCompanies';
import LoginView from './components/Auth/LoginView';
import RegisterView from './components/Auth/RegisterView';
import ResetPasswordView from './components/Auth/ResetPasswordView';
import LoadingSpinner from './components/Common/LoadingSpinner';
import CalendarView from './components/Calendar/CalendarView';
import SummaryView from './components/Summary/SummaryView';
import ProfileView from './components/Profile/ProfileView';
import Navigation from './components/Navigation/Navigation';
import CoordinatorDashboard from './views/coordinator/CoordinatorDashboard';
import SecretaryDashboard from './views/secretary/SecretaryDashboard';
import './App.css';

function App() {
  const auth = useAuth();
  const shifts = useShifts(auth.user?.id);
  const companies = useCompanies(auth.user?.id);

  const [showRegister, setShowRegister] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [activeView, setActiveView] = useState('calendar');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setShowResetPassword(true);
    }
  }, []);

  const handleResendEmail = async () => {
    const result = await auth.resendConfirmationEmail();
    setResendMessage(result.success ? 'Email di conferma inviata!' : "Errore nell'invio dell'email");
    setTimeout(() => setResendMessage(''), 3000);
  };

  const handleResetComplete = () => {
    setShowResetPassword(false);
    window.location.hash = '';
  };

  // Reset password
  if (showResetPassword) return <ResetPasswordView onComplete={handleResetComplete} />;

  // Caricamento auth
  if (auth.loading) return <LoadingSpinner />;

  // Email non confermata
  if (auth.user && !auth.emailConfirmed) {
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

  // Non autenticato
  if (!auth.isAuthenticated) {
    return showRegister ? (
      <RegisterView onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginView
        onLogin={auth.signIn}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  // Autenticato ma profilo ancora in caricamento → aspetta max 5s poi procedi
  if (!auth.profile) return <LoadingSpinner />;

  // ── Ruoli ─────────────────────────────────────────────────
  if (auth.profile.role === 'coordinator') {
    return (
      <CoordinatorDashboard
        user={auth.user}
        profile={auth.profile}
        onSignOut={auth.signOut}
      />
    );
  }

  if (auth.profile.role === 'secretary') {
    return (
      <SecretaryDashboard
        user={auth.user}
        profile={auth.profile}
        onSignOut={auth.signOut}
      />
    );
  }
  // ──────────────────────────────────────────────────────────

  // Worker — app normale
  return (
    <div className="app-container">
      <Navigation activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        {activeView === 'calendar' && (
          <CalendarView
            shifts={shifts}
            companies={companies}
            profile={auth.profile}
          />
        )}
        {activeView === 'summary' && (
          <SummaryView
            shifts={shifts}
            companies={companies}
            profile={auth.profile}
          />
        )}
        {activeView === 'profile' && (
          <ProfileView
            user={auth.user}
            profile={auth.profile}
            companies={companies}
            onSignOut={auth.signOut}
          />
        )}
      </main>
    </div>
  );
}

export default App;