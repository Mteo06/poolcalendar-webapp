import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CompanyModal from './CompanyModal';
import './ProfileView.css';


const ProfileView = ({ user, profile, companies, onSignOut }) => {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false); 
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  const [emailData, setEmailData] = useState({
    newEmail: user?.email || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [usernameData, setUsernameData] = useState({
    newUsername: profile?.username || ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  // NUOVO: Stati per certificati
  const [isEditingCertificates, setIsEditingCertificates] = useState(false);
  const [certificatesData, setCertificatesData] = useState({
    blsd_expiry: profile?.blsd_expiry || '',
    ab_license_expiry: profile?.ab_license_expiry || '',
    medical_cert_expiry: profile?.medical_cert_expiry || ''
  });

  // NUOVO: useEffect per aggiornare certificati quando profile cambia
  useEffect(() => {
    if (profile) {
      setCertificatesData({
        blsd_expiry: profile.blsd_expiry || '',
        ab_license_expiry: profile.ab_license_expiry || '',
        medical_cert_expiry: profile.medical_cert_expiry || ''
      });
    }
  }, [profile]);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    
    if (!usernameData.newUsername || usernameData.newUsername.length < 3) {
      setMessage({ type: 'error', text: 'Lo username deve essere almeno 3 caratteri' });
      return;
    }

    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: usernameData.newUsername })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Username aggiornato con successo!' });
      setIsEditingUsername(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

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

  // NUOVO: Funzione per aggiornare certificati
  const handleUpdateCertificates = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          blsd_expiry: certificatesData.blsd_expiry || null,
          ab_license_expiry: certificatesData.ab_license_expiry || null,
          medical_cert_expiry: certificatesData.medical_cert_expiry || null
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Certificati aggiornati con successo!' });
      setIsEditingCertificates(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // NUOVO: Funzione per controllare stato certificato
  const getCertificateStatus = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Scaduto', class: 'cert-expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Scade tra ${daysUntilExpiry} giorni`, class: 'cert-expiring' };
    } else {
      return { status: 'valid', message: 'Valido', class: 'cert-valid' };
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
            {isEditingUsername ? (
              <form onSubmit={handleUpdateUsername} className="inline-form">
                <input
                  type="text"
                  value={usernameData.newUsername}
                  onChange={(e) => setUsernameData({ newUsername: e.target.value })}
                  className="inline-input"
                  required
                  minLength={3}
                  placeholder="Almeno 3 caratteri"
                />
                <button type="submit" className="btn-save-inline">Salva</button>
                <button 
                  type="button" 
                  className="btn-cancel-inline"
                  onClick={() => {
                    setIsEditingUsername(false);
                    setUsernameData({ newUsername: profile?.username || '' });
                  }}
                >
                  Annulla
                </button>
              </form>
            ) : (
              <>
                <span className="info-value">{profile?.username || 'N/A'}</span>
                <button 
                  className="btn-edit"
                  onClick={() => setIsEditingUsername(true)}
                >
                  Modifica
                </button>
              </>
            )}
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

      {/* NUOVO: Certificati e Brevetti */}
      <div className="profile-section">
  <div className="section-header">
    <h2>📋 Certificati e Brevetti</h2>
    {!isEditingCertificates && (
      <button 
        className="btn-add"
        onClick={() => setIsEditingCertificates(true)}
      >
        ✏️ Modifica  {/* ← Aggiungi emoji per renderlo più simile agli altri */}
      </button>
    )}
        </div>

        {isEditingCertificates ? (
          <form onSubmit={handleUpdateCertificates} className="certificates-form">
            <div className="cert-form-group">
              <label>🚑 BLSD - Scadenza</label>
              <input
                type="date"
                value={certificatesData.blsd_expiry}
                onChange={(e) => setCertificatesData({...certificatesData, blsd_expiry: e.target.value})}
                className="cert-input"
              />
            </div>

            <div className="cert-form-group">
              <label>🏊 Brevetto AB - Scadenza</label>
              <input
                type="date"
                value={certificatesData.ab_license_expiry}
                onChange={(e) => setCertificatesData({...certificatesData, ab_license_expiry: e.target.value})}
                className="cert-input"
              />
            </div>

            <div className="cert-form-group">
              <label>🩺 Certificato Medico - Scadenza</label>
              <input
                type="date"
                value={certificatesData.medical_cert_expiry}
                onChange={(e) => setCertificatesData({...certificatesData, medical_cert_expiry: e.target.value})}
                className="cert-input"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Salva Certificati
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setIsEditingCertificates(false);
                  setCertificatesData({
                    blsd_expiry: profile?.blsd_expiry || '',
                    ab_license_expiry: profile?.ab_license_expiry || '',
                    medical_cert_expiry: profile?.medical_cert_expiry || ''
                  });
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <div className="certificates-list">
            {/* BLSD */}
            <div className="certificate-item">
              <div className="cert-icon">🚑</div>
              <div className="cert-details">
                <h4>BLSD</h4>
                {profile?.blsd_expiry ? (
                  <>
                    <p className="cert-date">
                      Scadenza: {new Date(profile.blsd_expiry).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {getCertificateStatus(profile.blsd_expiry) && (
                      <span className={`cert-status ${getCertificateStatus(profile.blsd_expiry).class}`}>
                        {getCertificateStatus(profile.blsd_expiry).message}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="cert-not-set">Non impostato</p>
                )}
              </div>
            </div>

            {/* Brevetto AB */}
            <div className="certificate-item">
              <div className="cert-icon">🏊</div>
              <div className="cert-details">
                <h4>Brevetto AB</h4>
                {profile?.ab_license_expiry ? (
                  <>
                    <p className="cert-date">
                      Scadenza: {new Date(profile.ab_license_expiry).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {getCertificateStatus(profile.ab_license_expiry) && (
                      <span className={`cert-status ${getCertificateStatus(profile.ab_license_expiry).class}`}>
                        {getCertificateStatus(profile.ab_license_expiry).message}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="cert-not-set">Non impostato</p>
                )}
              </div>
            </div>

            {/* Certificato Medico */}
            <div className="certificate-item">
              <div className="cert-icon">🩺</div>
              <div className="cert-details">
                <h4>Certificato Medico</h4>
                {profile?.medical_cert_expiry ? (
                  <>
                    <p className="cert-date">
                      Scadenza: {new Date(profile.medical_cert_expiry).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    {getCertificateStatus(profile.medical_cert_expiry) && (
                      <span className={`cert-status ${getCertificateStatus(profile.medical_cert_expiry).class}`}>
                        {getCertificateStatus(profile.medical_cert_expiry).message}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="cert-not-set">Non impostato</p>
                )}
              </div>
            </div>
          </div>
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

              {!company.is_active && (
                <div className="company-inactive-message">
                  <span>⏸️ Società disattivata. Attivala per usarla nei turni.</span>
                </div>
              )}
            </div>
          ))}
        </div>

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
          <button className="btn-logout" onClick={onSignOut}>
            🚪 Esci
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
