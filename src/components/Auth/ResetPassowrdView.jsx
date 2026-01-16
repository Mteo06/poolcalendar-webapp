import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import '../Auth/Auth.css';

const ResetPasswordView = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verifica che ci sia un hash nella URL (token di reset)
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      setError('Link di reset non valido o scaduto');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La password deve essere almeno 6 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      
      // Reindirizza al login dopo 3 secondi
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Errore durante il reset della password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-animation">✅</div>
          <h1 className="auth-title">Password Aggiornata!</h1>
          <p className="auth-subtitle">Verrai reindirizzato al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🔐 Nuova Password</h1>
        <p className="auth-subtitle">Inserisci la tua nuova password</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <input
            type="password"
            className="auth-input"
            placeholder="Nuova Password (min. 6 caratteri)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />

          <input
            type="password"
            className="auth-input"
            placeholder="Conferma Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordView;
