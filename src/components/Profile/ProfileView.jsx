import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CompanyModal from './CompanyModal';
import './ProfileView.css';

const ProfileView = ({ user, profile, companies, onSignOut }) => {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [emailData, setEmailData] = useState({
    newEmail: user?.email || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Email aggiornata! Controlla la tua nuova email per confermare.' });
      setIsEditingEmail(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La password deve essere almeno 6 caratteri' });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
      setIsEditingPassword(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleActive = async (companyId) => {
    const result = await companies.toggleCompanyActive(companyId);
    if (result.success) {
      const company = companies.companies.find(c => c.id === companyId);
      const newStatus = !company.is_active;
      setMessage({ 
        type: 'success', 
        text: `${company.name} ${newStatus ? 'attivata' : 'disattivata'}!` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: 'Errore durante l\'operazione' });
    }
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setShowCompanyModal(true);
  };

  return (
    <div className="profile-view">
      <h1>Profilo</h1>

      {message.text && (
        <div className={`profile-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Informazioni Account */}
      <div className="profile-section">
        <h2>Informazioni Account</h2>
        
        <div className="profile-info">
          <div className="info-row">
            <span className="info-label">👤 Username:</span>
            <span className="info-value">{profile?.username || 'N/A'}</span>
          </div>

          <div className="info-row">
            <span className="info-label">📧 Email:</span>
            {isEditingEmail ? (
              <form onSubmit={handleUpdateEmail} className="inline-form">
                <input
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData({ newEmail: e.target.value })}
                  className="inline-input"
                  required
                />
                <button type="submit" className="btn-save-inline">Salva</button>
                <button 
                  type="button" 
                  className="btn-cancel-inline"
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmailData({ newEmail: user?.email || '' });
                  }}
                >
                  Annulla
                </button>
              </form>
            ) : (
              <>
                <span className="info-value">{user?.email}</span>
                <button 
                  className="btn-edit"
                  onClick={() => setIsEditingEmail(true)}
                >
                  Modifica
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modifica Password */}
      <div className="profile-section">
        <h2>Sicurezza</h2>
        
        {!isEditingPassword ? (
          <button 
            className="btn-primary"
            onClick={() => setIsEditingPassword(true)}
          >
            Modifica Password
          </button>
        ) : (
          <form onSubmit={handleUpdatePassword} className="password-form">
            <div className="form-group">
              <label>Nuova Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Almeno 6 caratteri"
                required
              />
            </div>

            <div className="form-group">
              <label>Conferma Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Ripeti la password"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Salva Password</button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setIsEditingPassword(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Società - CON TOGGLE ATTIVA/DISATTIVA */}
      <div className="profile-section">
        <div className="section-header">
          <h2>Gestione Società</h2>
          <button className="btn-add" onClick={handleAddCompany}>
            + Aggiungi Società
          </button>
        </div>

        <div className="companies-info">
          <p className="info-text">
            💡 Puoi avere più società contemporaneamente. Attiva quelle che usi regolarmente.
          </p>
        </div>

        <div className="companies-list">
          {companies.companies.map(company => (
            <div 
              key={company.id} 
              className={`company-card ${company.is_active ? 'active' : 'inactive'}`}
            >
              <div className="company-header">
                <div className="company-title-row">
                  <h3>{company.name}</h3>
                  {company.is_default && (
                    <span className="default-badge">Default</span>
                  )}
                </div>
                
                {/* TOGGLE ATTIVA/DISATTIVA */}
                <div className="company-toggle">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={company.is_active}
                      onChange={() => handleToggleActive(company.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-label">
                    {company.is_active ? 'Attiva' : 'Disattivata'}
                  </span>
                </div>
              </div>

              {/* Mostra dettagli solo se attiva */}
              {company.is_active && (
                <>
                  <div className="company-roles">
                    {Object.entries(company.roles || {}).map(([role, data]) => (
                      <div key={role} className="role-item">
                        <span className="role-name">{role}:</span>
                        <span className="role-rate">€{data.hourly_rate?.toFixed(2)}/h</span>
                      </div>
                    ))}
                  </div>

                  {company.facilities && company.facilities.length > 0 && (
                    <div className="company-facilities">
                      <span className="facilities-label">🏊 Impianti:</span>
                      <div className="facilities-tags">
                        {company.facilities.slice(0, 3).map((facility, idx) => (
                          <span key={idx} className="facility-tag">{facility}</span>
                        ))}
                        {company.facilities.length > 3 && (
                          <span className="facility-tag">+{company.facilities.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="company-actions">
                    <button 
                      className="btn-edit-small"
                      onClick={() => handleEditCompany(company)}
                    >
                      ✏️ Modifica
                    </button>
                    
                    {!company.is_default && (
                      <button 
                        className="btn-delete-small"
                        onClick={async () => {
                          if (window.confirm(`Eliminare ${company.name}? Tutti i turni associati rimarranno ma senza società.`)) {
                            await companies.deleteCompany(company.id);
                            setMessage({ type: 'success', text: 'Società eliminata' });
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                          }
                        }}
                      >
                        🗑️ Elimina
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Messaggio quando disattivata */}
              {!company.is_active && (
                <div className="company-inactive-message">
                  <span>⏸️ Società disattivata. Attivala per usarla nei turni.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Statistiche società */}
        <div className="companies-stats">
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <span className="stat-label">Totali:</span>
            <span className="stat-value">{companies.companies.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">✅</span>
            <span className="stat-label">Attive:</span>
            <span className="stat-value">{companies.activeCompanies.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⏸️</span>
            <span className="stat-label">Disattivate:</span>
            <span className="stat-value">{companies.companies.length - companies.activeCompanies.length}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="profile-section">
        <h2>Sessione</h2>
        <button className="btn-logout" onClick={onSignOut}>
          🚪 Disconnetti
        </button>
      </div>

      {showCompanyModal && (
        <CompanyModal
          company={selectedCompany}
          onClose={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
          onSave={async () => {
            await companies.refreshCompanies();
            setShowCompanyModal(false);
            setSelectedCompany(null);
            setMessage({ type: 'success', text: 'Società salvata!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          }}
        />
      )}
    </div>
  );
};

export default ProfileView;
