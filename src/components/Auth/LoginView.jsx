import React, { useState } from 'react';
import '../Auth/Auth.css';

const LoginView = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onLogin(email, password, rememberMe);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    
    if (!resetEmail) {
      setError('Inserisci la tua email');
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setResetMessage('✅ Email inviata! Controlla la tua casella di posta.');
      setResetEmail('');
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Errore durante l\'invio dell\'email');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">🔐 Recupera Password</h1>
          <p className="auth-subtitle">Ti invieremo un link per reimpostare la password</p>

          <form className="auth-form" onSubmit={handleForgotPassword}>
            {error && <div className="auth-error">{error}</div>}
            {resetMessage && <div className="auth-success">{resetMessage}</div>}

            <input
              type="email"
              className="auth-input"
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              disabled={loading}
            />

            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Invio in corso...' : 'Invia Link di Reset'}
            </button>

            <button
              type="button"
              className="auth-button secondary"
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setResetMessage('');
              }}
              disabled={loading}
            >
              ← Torna al Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🏊‍♂️ PoolCalendar</h1>
        <p className="auth-subtitle">Bentornato!</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            Rimani connesso
          </label>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={() => setShowForgotPassword(true)}
            disabled={loading}
          >
            Password dimenticata?
          </button>

          <button
            type="button"
            className="auth-button secondary"
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            Non hai un account? Registrati
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
