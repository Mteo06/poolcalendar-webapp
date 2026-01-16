import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ShiftModal.css';

const ShiftModal = ({ shift, companies, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    company_id: '',
    facility: '',
    role: 'AB',
    start_time: '',
    end_time: '',
    break_duration: 0,
    date: ''
  });
  
  // NUOVO: Stati per turni ricorrenti
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('weekly'); // weekly o monthly
  const [recurringEndDate, setRecurringEndDate] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    if (shift) {
      const startDate = new Date(shift.start_time);
      const company = companies.getCompanyById(shift.company_id);
      
      setFormData({
        company_id: shift.company_id || '',
        facility: shift.facility || '',
        role: shift.role || 'AB',
        start_time: startDate.toTimeString().slice(0, 5),
        end_time: new Date(shift.end_time).toTimeString().slice(0, 5),
        break_duration: shift.break_duration || 0,
        date: startDate.toISOString().split('T')[0]
      });
      setSelectedCompany(company);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const firstActive = companies.activeCompanies[0];
      
      setFormData({
        company_id: firstActive?.id || '',
        facility: '',
        role: 'AB',
        start_time: '09:00',
        end_time: '17:00',
        break_duration: 0,
        date: today
      });
      setSelectedCompany(firstActive);
      
      // Imposta data fine ricorrenza default (1 mese dopo)
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      setRecurringEndDate(oneMonthLater.toISOString().split('T')[0]);
    }
  }, [shift, companies]);

  const handleCompanyChange = (companyId) => {
    const company = companies.getCompanyById(companyId);
    setSelectedCompany(company);
    setFormData({
      ...formData,
      company_id: companyId,
      facility: '',
      role: company?.roles ? Object.keys(company.roles)[0] : 'AB'
    });
  };

  // NUOVO: Genera date ricorrenti
  const generateRecurringDates = (startDate, endDate, type) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current));
      
      if (type === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (type === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Utente non autenticato');
        setSaving(false);
        return;
      }

      if (!formData.company_id) {
        setError('Seleziona una società');
        setSaving(false);
        return;
      }

      const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`);

      if (endDateTime <= startDateTime) {
        setError('L\'ora di fine deve essere successiva all\'ora di inizio');
        setSaving(false);
        return;
      }

      // MODIFICA TURNO ESISTENTE
      if (shift) {
        const shiftData = {
          company_id: formData.company_id,
          facility: formData.facility,
          role: formData.role,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_duration: parseInt(formData.break_duration) || 0,
          user_id: user.id
        };

        const { error: updateError } = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', shift.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        
        console.log('Shift updated successfully');
        onSave();
        return;
      }

      // NUOVO TURNO
      if (isRecurring && recurringEndDate) {
        // Turni ricorrenti
        if (new Date(recurringEndDate) < new Date(formData.date)) {
          setError('La data di fine deve essere successiva alla data di inizio');
          setSaving(false);
          return;
        }

        const dates = generateRecurringDates(formData.date, recurringEndDate, recurringType);
        const shiftsToInsert = dates.map(date => {
          const start = new Date(date);
          const end = new Date(date);
          
          const [startHour, startMin] = formData.start_time.split(':');
          const [endHour, endMin] = formData.end_time.split(':');
          
          start.setHours(parseInt(startHour), parseInt(startMin), 0);
          end.setHours(parseInt(endHour), parseInt(endMin), 0);

          return {
            company_id: formData.company_id,
            facility: formData.facility,
            role: formData.role,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            break_duration: parseInt(formData.break_duration) || 0,
            user_id: user.id
          };
        });

        const { error: insertError } = await supabase
          .from('shifts')
          .insert(shiftsToInsert);

        if (insertError) throw insertError;

        console.log(`${shiftsToInsert.length} turni ricorrenti creati con successo`);
        onSave();
      } else {
        // Turno singolo
        const shiftData = {
          company_id: formData.company_id,
          facility: formData.facility,
          role: formData.role,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_duration: parseInt(formData.break_duration) || 0,
          user_id: user.id
        };

        const { error: insertError } = await supabase
          .from('shifts')
          .insert([shiftData]);

        if (insertError) throw insertError;

        console.log('Shift added successfully');
        onSave();
      }
    } catch (err) {
      console.error('Error saving shift:', err);
      setError(err.message || 'Errore durante il salvataggio');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo turno?')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Utente non autenticato');
        return;
      }

      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shift.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      console.log('Shift deleted successfully');
      onDelete();
    } catch (err) {
      console.error('Error deleting shift:', err);
      setError(err.message || 'Errore durante l\'eliminazione');
    }
  };

  const facilities = selectedCompany?.facilities || [];
  const roles = selectedCompany?.roles ? Object.keys(selectedCompany.roles) : ['AB', 'Accoglienza', 'Istruttore', 'Reception'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{shift ? 'Modifica Turno' : 'Nuovo Turno'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="shift-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          {/* SELEZIONE SOCIETÀ */}
          <div className="form-group">
            <label>Società *</label>
            <select
              value={formData.company_id}
              onChange={(e) => handleCompanyChange(e.target.value)}
              required
            >
              <option value="">Seleziona società</option>
              {companies.activeCompanies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Data Inizio *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
              disabled={shift} // Non modificabile se è un turno esistente
            />
          </div>

          {/* NUOVO: Turni ricorrenti (solo per nuovi turni) */}
          {!shift && (
            <>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <span>Turno ricorrente</span>
                </label>
              </div>

              {isRecurring && (
                <>
                  <div className="form-group">
                    <label>Tipo Ricorrenza *</label>
                    <select
                      value={recurringType}
                      onChange={(e) => setRecurringType(e.target.value)}
                    >
                      <option value="weekly">Settimanale</option>
                      <option value="monthly">Mensile</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Data Fine Ricorrenza *</label>
                    <input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      required={isRecurring}
                      min={formData.date}
                    />
                  </div>

                  <div className="recurring-info">
                    ℹ️ {recurringType === 'weekly' ? 'Il turno si ripeterà ogni settimana' : 'Il turno si ripeterà ogni mese'} fino al {new Date(recurringEndDate).toLocaleDateString('it-IT')}
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Ora Inizio *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Ora Fine *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          {/* IMPIANTO */}
          <div className="form-group">
            <label>Impianto *</label>
            {facilities.length > 0 ? (
              <select
                value={formData.facility}
                onChange={(e) => setFormData({...formData, facility: e.target.value})}
                required
                disabled={!formData.company_id}
              >
                <option value="">
                  {formData.company_id ? 'Seleziona impianto' : 'Prima seleziona una società'}
                </option>
                {facilities.map(facility => (
                  <option key={facility} value={facility}>{facility}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nome impianto"
                value={formData.facility}
                onChange={(e) => setFormData({...formData, facility: e.target.value})}
                required
                disabled={!formData.company_id}
              />
            )}
          </div>

          <div className="form-group">
            <label>Ruolo *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              required
              disabled={!formData.company_id}
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pausa (minuti)</label>
            <input
              type="number"
              min="0"
              step="5"
              value={formData.break_duration}
              onChange={(e) => setFormData({...formData, break_duration: e.target.value})}
              placeholder="0"
            />
          </div>

          {/* Info tariffa */}
          {selectedCompany && formData.role && (
            <div className="rate-info">
              💰 Tariffa: €{selectedCompany.roles?.[formData.role]?.hourly_rate?.toFixed(2) || '0.00'}/h
            </div>
          )}
        </form>

        <div className="modal-actions">
          {shift && (
            <button
              type="button"
              className="btn-delete"
              onClick={handleDelete}
              disabled={saving}
            >
              Elimina
            </button>
          )}
          <button 
            type="submit" 
            className="btn-save"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Salvataggio...' : (shift ? 'Salva Modifiche' : (isRecurring ? 'Crea Turni Ricorrenti' : 'Aggiungi Turno'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;
