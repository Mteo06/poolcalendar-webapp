import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Auth.css';

const RegisterView = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
    confirmPassword: '', full_name: '', phone: '', birth_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const roles = [
    { id: 'worker',      icon: '🏊', title: 'Lavoratore',   description: 'Visualizza e gestisci i tuoi turni, guadagni e certificati.' },
    { id: 'coordinator', icon: '📋', title: 'Coordinatore', description: 'Assegna turni ai lavoratori e gestisci il piano vasca.' },
    { id: 'secretary',   icon: '🗂️', title: 'Segreteria',   description: 'Visualizza il piano vasca in sola lettura.' },
  ];

    const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' }); return;
    }
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password minimo 6 caratteri' }); return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username:   formData.username,
            full_name:  formData.full_name,
            phone:      formData.phone || null,
            birth_date: formData.birth_date || null,
            role:       selectedRole,
          }
        }
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Registrazione completata! Controlla la tua email.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🏊</span>
          <h1>PoolCalendar</h1>
        </div>

        {step === 1 && (
          <>
            <h2 className="auth-title">Crea Account</h2>
            <p className="auth-subtitle">Seleziona il tuo ruolo</p>
            <div className="role-selection">
              {roles.map(role => (
                <button key={role.id} className="role-card" type="button"
                  onClick={() => { setSelectedRole(role.id); setStep(2); }}>
                  <span className="role-card-icon">{role.icon}</span>
                  <div className="role-card-text">
                    <h3>{role.title}</h3>
                    <p>{role.description}</p>
                  </div>
                  <span className="role-card-arrow">›</span>
                </button>
              ))}
            </div>
            <p className="auth-switch">
              Hai già un account?{' '}
              <button onClick={onSwitchToLogin} className="link-btn">Accedi</button>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <button className="back-btn" onClick={() => setStep(1)}>← Cambia ruolo</button>
            <div className="selected-role-badge">
              {roles.find(r => r.id === selectedRole)?.icon}{' '}
              {roles.find(r => r.id === selectedRole)?.title}
            </div>
            <h2 className="auth-title">Completa la registrazione</h2>
            {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label>Nome e Cognome *</label>
                <input type="text" value={formData.full_name} required placeholder="Mario Rossi"
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input type="text" value={formData.username} required minLength={3} placeholder="mario.rossi"
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={formData.email} required placeholder="mario@esempio.it"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Telefono</label>
                <input type="tel" value={formData.phone} placeholder="+39 333 1234567"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Data di Nascita</label>
                <input type="date" value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={formData.password} required minLength={6} placeholder="Almeno 6 caratteri"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Conferma Password *</label>
                <input type="password" value={formData.confirmPassword} required placeholder="Ripeti la password"
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Registrazione...' : 'Crea Account'}
              </button>
            </form>
            <p className="auth-switch">
              Hai già un account?{' '}
              <button onClick={onSwitchToLogin} className="link-btn">Accedi</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterView;
