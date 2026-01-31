import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './CompanyModal.css';

const CompanyModal = ({ company, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    roles: {
      'AB': { hourly_rate: '' },
      'Accoglienza': { hourly_rate: '' },
      'Istruttore': { hourly_rate: '' },
      'Reception': { hourly_rate: '' }
    },
    facilities: []
  });
  
  const [newFacility, setNewFacility] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newRoleRate, setNewRoleRate] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        roles: company.roles || {
          'AB': { hourly_rate: '' },
          'Accoglienza': { hourly_rate: '' },
          'Istruttore': { hourly_rate: '' },
          'Reception': { hourly_rate: '' }
        },
        facilities: company.facilities || []
      });
    }
  }, [company]);

  // ✅ FIX: Accetta sia virgola che punto per decimali
  const handleRoleChange = (role, value) => {
    // Permetti solo numeri, punto e virgola
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    
    setFormData({
      ...formData,
      roles: {
        ...formData.roles,
        [role]: { hourly_rate: cleanValue }
      }
    });
  };

  const handleRemoveRole = (role) => {
    const newRoles = { ...formData.roles };
    delete newRoles[role];
    setFormData({
      ...formData,
      roles: newRoles
    });
  };

  // ✅ Funzione per aggiungere ruolo personalizzato
  const handleAddRole = () => {
    if (newRole.trim() && !formData.roles[newRole.trim()]) {
      const cleanRate = newRoleRate.replace(',', '.');
      setFormData({
        ...formData,
        roles: {
          ...formData.roles,
          [newRole.trim()]: { hourly_rate: cleanRate || '0' }
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

      // ✅ Normalizza i valori convertendo virgole in punti
      const normalizedRoles = {};
      Object.keys(formData.roles).forEach(role => {
        const rateValue = String(formData.roles[role].hourly_rate).replace(',', '.');
        normalizedRoles[role] = {
          hourly_rate: parseFloat(rateValue) || 0
        };
      });

      const dataToSave = {
        ...formData,
        roles: normalizedRoles
      };

      // Milanosport (default) - salva solo in localStorage
      if (company?.is_default) {
        localStorage.setItem('milanosport_custom', JSON.stringify({
          roles: dataToSave.roles,
          facilities: dataToSave.facilities
        }));
      } 
      // Modifica società esistente
      else if (company && !company.is_default) {
        await supabase
          .from('companies')
          .update({
            name: dataToSave.name,
            roles: dataToSave.roles,
            facilities: dataToSave.facilities
          })
          .eq('id', company.id);
      } 
      // Nuova società
      else {
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
      alert('Errore durante il salvataggio');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content company-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{company?.is_default ? '⚙️ Personalizza Milanosport' : company ? '✏️ Modifica Società' : '➕ Nuova Società'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Nome Società */}
            {!company?.is_default && (
              <div className="form-group">
                <label>Nome Società *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es: Aquamore, Swim Academy..."
                  required
                />
              </div>
            )}

            {/* Ruoli e Paghe */}
            <div className="form-group">
              <label>💰 Ruoli e Paghe Orarie</label>
              <div className="roles-list">
                {Object.entries(formData.roles).map(([role, data]) => (
                  <div key={role} className="role-row">
                    <span className="role-name">{role}</span>
                    <div className="role-input-group">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data.hourly_rate}
                        onChange={(e) => handleRoleChange(role, e.target.value)}
                        placeholder="0.00"
                        className="role-rate-input"
                      />
                      <span className="currency">€/h</span>
                    </div>
                    {Object.keys(formData.roles).length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-role"
                        onClick={() => handleRemoveRole(role)}
                        title="Rimuovi ruolo"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Aggiungi Ruolo Personalizzato */}
              <div className="add-role-section">
                <h4>➕ Aggiungi Ruolo Personalizzato</h4>
                <div className="add-role-form">
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Nome ruolo"
                    className="new-role-input"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newRoleRate}
                    onChange={(e) => setNewRoleRate(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                    placeholder="Paga (€/h)"
                    className="new-role-rate-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="btn-add-role"
                    disabled={!newRole.trim()}
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            </div>

            {/* Impianti */}
            <div className="form-group">
              <label>🏊 Impianti</label>
              <div className="facilities-list">
                {formData.facilities.map((facility, index) => (
                  <div key={index} className="facility-tag">
                    <span>{facility}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(index)}
                      className="remove-facility-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-facility-form">
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
                  onClick={handleAddFacility}
                  className="btn-add-facility"
                  disabled={!newFacility.trim()}
                >
                  Aggiungi
                </button>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annulla
            </button>
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
