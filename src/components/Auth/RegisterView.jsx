import React, { useState } from 'react';
import '../Auth/Auth.css';

const RegisterView = ({ onRegister, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La password deve essere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    setLoading(true);

    const result = await onRegister(email, password, username);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // Se success, App.jsx gestirà il redirect alla schermata di conferma email
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🏊‍♂️ PoolCalendar</h1>
        <p className="auth-subtitle">Crea il tuo account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <input
            type="text"
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
            name="username"
          />

          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            name="email"
          />

          <input
            type="password"
            className="auth-input"
            placeholder="Password (min. 6 caratteri)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            name="password"
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
            name="confirmPassword"
          />

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>

          <button
            type="button"
            className="auth-button secondary"
            onClick={onSwitchToLogin}
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
