import React, { useState, useEffect } from 'react';
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

  // NUOVO: Stati per certificati
  const [isEditingCertificates, setIsEditingCertificates] = useState(false);
  const [certificatesData, setCertificatesData] = useState({
    blsd_expiry: profile?.blsd_expiry || '',
    ab_license_expiry: profile?.ab_license_expiry || '',
    medical_cert_expiry: profile?.medical_cert_expiry || ''
  });

  // NUOVO: useEffect per certificati
  useEffect(() => {
    if (profile) {
      setCertificatesData({
        blsd_expiry: profile.blsd_expiry || '',
        ab_license_expiry: profile.ab_license_expiry || '',
        medical_cert_expiry: profile.medical_cert_expiry || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      setEmailData({ newEmail: user.email || '' });
    }
  }, [user]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    
    if (!emailData.newEmail || emailData.newEmail === user.email) {
      setMessage({ type: 'error', text: 'Inserisci una nuova email valida' });
      return;
    }

    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Email aggiornata! Controlla la tua casella per confermare.' });
      setIsEditingEmail(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La password deve essere almeno 6 caratteri' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      return;
    }

    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
      setIsEditingPassword(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // NUOVO: Funzione per aggiornare certificati
  const handleUpdateCertificates = async (e) => {
    e.preventDefault();
    
    try {
      const { supabase } = await import('../../lib/supabaseClient');
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

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setShowCompanyModal(true);
  };

  const handleArchiveCompany = async (companyId) => {
    if (!window.confirm('Sei sicuro di voler archiviare questa società?')) {
      return;
    }

    try {
      const { supabase } = await import('../../lib/supabaseClient');
      const { error } = await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('id', companyId)
        .eq('user_id', user.id);

      if (error) throw error;

      await companies.refreshCompanies();
      setMessage({ type: 'success', text: 'Società archiviata con successo!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
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

      {/* Sicurezza */}
      <div className="profile-section">
        <h2>Sicurezza</h2>
        
        {isEditingPassword ? (
          <form onSubmit={handleUpdatePassword} className="password-form">
            <div className="form-group">
              <label>Nuova Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Almeno 6 caratteri"
                className="form-input"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>Conferma Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Ripeti la password"
                className="form-input"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Aggiorna Password
              </button>
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
        ) : (
          <button 
            className="btn-secondary"
            onClick={() => setIsEditingPassword(true)}
          >
            🔒 Cambia Password
          </button>
        )}
      </div>

      {/* NUOVO: Certificati e Brevetti */}
      <div className="profile-section">
        <div className="section-header">
          <h2>📋 Certificati e Brevetti</h2>
          {!isEditingCertificates && (
            <button 
              className="btn-edit-small"
              onClick={() => setIsEditingCertificates(true)}
            >
              ✏️ Modifica
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

      {/* Gestione Società */}
      <div className="profile-section">
        <div className="section-header">
          <h2>🏢 Società</h2>
          <button className="btn-add" onClick={handleAddCompany}>
            + Aggiungi
          </button>
        </div>

        {companies.loading ? (
          <p>Caricamento società...</p>
        ) : companies.activeCompanies.length === 0 ? (
          <div className="empty-state-small">
            <p>Nessuna società configurata</p>
            <button className="btn-primary" onClick={handleAddCompany}>
              Aggiungi la tua prima società
            </button>
          </div>
        ) : (
          <div className="companies-list">
            {companies.activeCompanies.map(company => (
              <div key={company.id} className="company-card">
                <div className="company-info">
                  <h3>{company.name}</h3>
                  <p className="company-details">
                    {Object.keys(company.roles || {}).length} ruoli • 
                    {company.facilities?.length || 0} impianti
                  </p>
                </div>
                <div className="company-actions">
                  <button 
                    className="btn-edit-icon"
                    onClick={() => handleEditCompany(company)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-archive-icon"
                    onClick={() => handleArchiveCompany(company.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="profile-section">
        <button className="btn-logout" onClick={onSignOut}>
          🚪 Esci
        </button>
      </div>

      {/* Company Modal */}
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
