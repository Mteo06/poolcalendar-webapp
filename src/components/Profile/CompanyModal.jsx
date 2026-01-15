import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './CompanyModal.css';

const CompanyModal = ({ company, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    roles: {
      AB: { hourly_rate: 0 },
      Accoglienza: { hourly_rate: 0 },
      Istruttore: { hourly_rate: 0 },
      Reception: { hourly_rate: 0 }
    },
    facilities: []
  });

  const [newFacility, setNewFacility] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        roles: company.roles || {
          AB: { hourly_rate: 0 },
          Accoglienza: { hourly_rate: 0 },
          Istruttore: { hourly_rate: 0 },
          Reception: { hourly_rate: 0 }
        },
        facilities: company.facilities || []
      });
    }
  }, [company]);

  const handleRoleChange = (role, value) => {
    setFormData({
      ...formData,
      roles: {
        ...formData.roles,
        [role]: { hourly_rate: parseFloat(value) || 0 }
      }
    });
  };

  const handleAddFacility = () => {
    if (newFacility.trim()) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, newFacility.trim()]
      });
      setNewFacility('');
    }
  };

  const handleRemoveFacility = (index) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Se è Milanosport (default), aggiorna il localStorage
      if (company?.is_default) {
        // Salva le preferenze personalizzate di Milanosport in localStorage
        localStorage.setItem('milanosport_custom', JSON.stringify({
          roles: formData.roles,
          facilities: formData.facilities
        }));
      } else if (company && !company.is_default) {
        // Aggiorna società custom esistente
        await supabase
          .from('companies')
          .update({
            name: formData.name,
            roles: formData.roles,
            facilities: formData.facilities
          })
          .eq('id', company.id);
      } else {
        // Crea nuova società
        await supabase
          .from('companies')
          .insert([{
            user_id: user.id,
            name: formData.name,
            roles: formData.roles,
            facilities: formData.facilities
          }]);
      }

      onSave();
    } catch (error) {
      console.error('Errore salvataggio società:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content company-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{company ? `Modifica ${company.name}` : 'Nuova Società'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="company-form" onSubmit={handleSubmit}>
          {!company?.is_default && (
            <div className="form-group">
              <label>Nome Società *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Es. Aquamore, Sportcity..."
                required
              />
            </div>
          )}

          {company?.is_default && (
            <div className="info-banner">
              ℹ️ Stai personalizzando le tariffe e gli impianti di Milanosport
            </div>
          )}

          <div className="form-section">
            <h3>Tariffe Orarie</h3>
            <p className="form-hint">Lascia a 0 i ruoli non utilizzati</p>
            
            <div className="roles-grid">
              {Object.keys(formData.roles).map(role => (
                <div key={role} className="role-input">
                  <label>{role}</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.roles[role].hourly_rate}
                      onChange={(e) => handleRoleChange(role, e.target.value)}
                      placeholder="0.00"
                    />
                    <span className="unit">€/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Impianti</h3>
            
            <div className="add-facility">
              <input
                type="text"
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                placeholder="Nome impianto"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFacility();
                  }
                }}
              />
              <button 
                type="button" 
                className="btn-add-facility"
                onClick={handleAddFacility}
              >
                + Aggiungi
              </button>
            </div>

            <div className="facilities-list">
              {formData.facilities.map((facility, index) => (
                <div key={index} className="facility-item">
                  <span>{facility}</span>
                  <button
                    type="button"
                    className="btn-remove-facility"
                    onClick={() => handleRemoveFacility(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save">
              {company ? 'Salva Modifiche' : 'Crea Società'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
