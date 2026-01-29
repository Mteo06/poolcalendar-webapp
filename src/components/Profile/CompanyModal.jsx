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
  const [newRole, setNewRole] = useState(''); // ✅ NUOVO
  const [newRoleRate, setNewRoleRate] = useState(''); // ✅ NUOVO

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
    if (value === '' || value === '.') {
      setFormData({
        ...formData,
        roles: {
          ...formData.roles,
          [role]: { hourly_rate: value }
        }
      });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFormData({
          ...formData,
          roles: {
            ...formData.roles,
            [role]: { hourly_rate: numValue }
          }
        });
      }
    }
  };

  const handleRemoveRole = (role) => {
    const newRoles = { ...formData.roles };
    delete newRoles[role];
    setFormData({
      ...formData,
      roles: newRoles
    });
  };

  // ✅ NUOVO: Funzione per aggiungere ruolo
  const handleAddRole = () => {
    if (newRole.trim() && !formData.roles[newRole.trim()]) {
      setFormData({
        ...formData,
        roles: {
          ...formData.roles,
          [newRole.trim()]: { hourly_rate: parseFloat(newRoleRate) || 0 }
        }
      });
      setNewRole('');
      setNewRoleRate('');
    }
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

      const normalizedRoles = {};
      Object.keys(formData.roles).forEach(role => {
        normalizedRoles[role] = {
          hourly_rate: parseFloat(formData.roles[role].hourly_rate) || 0
        };
      });

      const dataToSave = {
        ...formData,
        roles: normalizedRoles
      };

      if (company?.is_default) {
        localStorage.setItem('milanosport_custom', JSON.stringify({
          roles: dataToSave.roles,
          facilities: dataToSave.facilities
        }));
      } else if (company && !company.is_default) {
        await supabase
          .from('companies')
          .update({
            name: dataToSave.name,
            roles: dataToSave.roles,
            facilities: dataToSave.facilities
          })
          .eq('id', company.id);
      } else {
        await supabase
          .from('companies')
          .insert([{
            user_id: user.id,
            name: dataToSave.name,
            roles: dataToSave.roles,
            facilities: dataToSave.facilities
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
          <h2>{company ? 'Modifica Società' : 'Nuova Società'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="company-form">
          {company?.is_default && (
            <div className="info-banner">
              ℹ️ Milanosport è una società predefinita. Puoi personalizzare ruoli e impianti.
            </div>
          )}

          <div className="form-group">
            <label>Nome Società</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={company?.is_default}
              placeholder="es. ASD Nuoto"
            />
          </div>

          <div className="form-section">
            <h3>💶 Paghe Orarie</h3>
            <p className="form-hint">Imposta la paga oraria per ogni ruolo</p>
            
            <div className="roles-grid">
              {Object.keys(formData.roles).map((role) => (
                <div key={role} className="role-input">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>{role}</label>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="btn-remove-role"
                      title="Elimina ruolo"
                    >
                      ×
                    </button>
                  </div>
                  <div className="input-with-unit">
                    <input
                      type="text"
                      value={formData.roles[role].hourly_rate === 0 ? '' : formData.roles[role].hourly_rate}
                      onChange={(e) => handleRoleChange(role, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '.') {
                          handleRoleChange(role, '0');
                        }
                      }}
                      placeholder="0.00"
                    />
                    <span className="unit">€/h</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ NUOVO: Form per aggiungere ruolo */}
            <div className="add-role-section">
              <p className="form-hint" style={{ marginTop: '16px', marginBottom: '8px' }}>
                Aggiungi nuovo ruolo
              </p>
              <div className="add-role">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Nome ruolo (es. Supervisore)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRole();
                    }
                  }}
                />
                <input
                  type="text"
                  value={newRoleRate}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setNewRoleRate(val);
                    }
                  }}
                  placeholder="Paga (€/h)"
                  className="rate-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRole();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="btn-add-facility"
                >
                  + Aggiungi
                </button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>🏊 Impianti</h3>
            <p className="form-hint">Aggiungi gli impianti dove lavori</p>
            
            <div className="add-facility">
              <input
                type="text"
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                placeholder="Nome impianto (es. Piscina Cozzi)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFacility();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddFacility}
                className="btn-add-facility"
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
                    onClick={() => handleRemoveFacility(index)}
                    className="btn-remove-facility"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-btn">
              Annulla
            </button>
            <button type="submit" className="save-btn">
              {company ? 'Salva Modifiche' : 'Crea Società'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
