import React, { useState } from 'react';
import './Auth.css';

const RegisterView = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere almeno 6 caratteri');
      return;
    }

    setLoading(true);
    const result = await onRegister(formData.email, formData.password, formData.username);
    
    if (result.success) {
      if (result.needsEmailConfirmation) {
        setSuccess('Registrazione completata! Controlla la tua email per confermare l\'account.');
        setNeedsEmailConfirm(true);
      } else {
        setSuccess('Registrazione completata! Accesso in corso...');
      }
    } else {
      setError(result.error || 'Errore durante la registrazione');
    }
    setLoading(false);
  };

  if (needsEmailConfirm) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">📧 Conferma Email</h1>
          <div className="email-confirm-message">
            <p>Abbiamo inviato un'email a:</p>
            <p className="email-highlight">{formData.email}</p>
            <p>Clicca sul link nell'email per confermare il tuo account.</p>
            <p className="note">Non hai ricevuto l'email? Controlla la cartella spam.</p>
          </div>
          <button 
            onClick={onSwitchToLogin} 
            className="auth-button primary"
          >
            Vai al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">PoolCalendar</h1>
        <h2 className="auth-subtitle">Registrazione</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
            className="auth-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Password (min. 6 caratteri)"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Conferma Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
            className="auth-input"
          />
          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}
          <button type="submit" disabled={loading} className="auth-button primary">
            {loading ? 'Registrazione...' : 'Registrati'}
          </button>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-button secondary"
            disabled={loading}
          >
            Hai già un account? Accedi
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterView;
