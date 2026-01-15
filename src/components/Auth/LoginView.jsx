import React, { useState } from 'react';
import './Auth.css';

const LoginView = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onLogin(formData.email, formData.password, formData.rememberMe);

    if (!result.success) {
      setError(result.error || 'Credenziali errate');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">PoolCalendar</h1>
        <h2 className="auth-subtitle">Accedi</h2>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />

          <label className="remember-me">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
            />
            <span>Rimani connesso</span>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>

          <button
            type="button"
            className="auth-button secondary"
            onClick={onSwitchToRegister}
          >
            Non hai un account? Registrati
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
