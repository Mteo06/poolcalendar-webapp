import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './AssignShiftModal.css';

const AssignShiftModal = ({ user, workers, selectedSlot, selectedShift, selectedDate, selectedFacility, onClose, onSave }) => {
  const isEdit  = !!selectedShift;
  const dateStr = selectedDate.toISOString().split('T')[0];
  const padH    = (h) => `${String(h).padStart(2,'0')}:00`;
  const toTime  = (dt) => new Date(dt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',hour12:false});

  const [form, setForm] = useState({
    worker_id:      selectedSlot?.workerId || selectedShift?.user_id || workers[0]?.id || '',
    facility:       selectedShift?.facility || selectedFacility || '',
    role:           selectedShift?.role || '',
    start_time:     selectedSlot ? padH(selectedSlot.hour)     : (selectedShift ? toTime(selectedShift.start_time) : '09:00'),
    end_time:       selectedSlot ? padH(selectedSlot.hour + 2) : (selectedShift ? toTime(selectedShift.end_time)   : '11:00'),
    break_duration: selectedShift?.break_duration || 0,
    notes:          selectedShift?.notes || '',
  });

  const [loading,  setLoading]  = useState(false);
  const [conflict, setConflict] = useState(null);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (form.worker_id && form.start_time && form.end_time) checkConflicts();
  }, [form.worker_id, form.start_time, form.end_time]);

  const checkConflicts = async () => {
    try {
      const startISO = `${dateStr}T${form.start_time}:00`;
      const endISO   = `${dateStr}T${form.end_time}:00`;
      let q = supabase.from('shifts').select('id,facility,role,start_time,end_time')
        .eq('user_id', form.worker_id).lt('start_time', endISO).gt('end_time', startISO);
      if (isEdit) q = q.neq('id', selectedShift.id);
      const { data } = await q;
      setConflict(data?.length > 0 ? data[0] : null);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.start_time >= form.end_time) {
      setError("L'orario di fine deve essere dopo l'inizio"); return;
    }
    setLoading(true);
    try {
      const shiftData = {
        user_id:        form.worker_id,
        facility:       form.facility,
        role:           form.role,
        start_time:     `${dateStr}T${form.start_time}:00`,
        end_time:       `${dateStr}T${form.end_time}:00`,
        break_duration: Number(form.break_duration) || 0,
        notes:          form.notes || null,
      };
      if (isEdit) {
        const { error: e } = await supabase.from('shifts').update(shiftData).eq('id', selectedShift.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('shifts').insert([shiftData]);
        if (e) throw e;
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questo turno?')) return;
    setLoading(true);
    try {
      const { error: e } = await supabase.from('shifts').delete().eq('id', selectedShift.id);
      if (e) throw e;
      onSave();
    } catch (err) {
      setError(err.message); setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="assign-modal" onClick={e => e.stopPropagation()}>
        <div className="assign-modal-header">
          <h2>{isEdit ? '✏️ Modifica Turno' : '➕ Assegna Turno'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="assign-form">
          <div className="form-group">
            <label>👤 Lavoratore *</label>
            <select value={form.worker_id} required onChange={e => setForm({ ...form, worker_id: e.target.value })}>
              <option value="">Seleziona...</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name || w.username}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>🏊 Impianto *</label>
            <input type="text" value={form.facility} required placeholder="Es: COZZI"
              onChange={e => setForm({ ...form, facility: e.target.value })} />
          </div>
          <div className="form-group">
            <label>🏷️ Ruolo *</label>
            <input type="text" value={form.role} required placeholder="Es: AB, Istruttore..."
              onChange={e => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>🕐 Inizio *</label>
              <input type="time" value={form.start_time} required
                onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label>🕔 Fine *</label>
              <input type="time" value={form.end_time} required
                onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>☕ Pausa (min)</label>
            <input type="number" min="0" max="120" value={form.break_duration}
              onChange={e => setForm({ ...form, break_duration: e.target.value })} />
          </div>
          <div className="form-group">
            <label>📝 Note</label>
            <textarea rows={2} value={form.notes} placeholder="Note opzionali..."
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          {conflict && (
            <div className="conflict-warning">
              ⚠️ <strong>Conflitto orario!</strong> Il lavoratore è già occupato:<br />
              <em>{conflict.role} @ {conflict.facility} ({new Date(conflict.start_time).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}–{new Date(conflict.end_time).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})})</em>
            </div>
          )}
          {error && <div className="assign-error">❌ {error}</div>}
          <div className="assign-footer">
            {isEdit && <button type="button" className="btn-delete" onClick={handleDelete} disabled={loading}>🗑️ Elimina</button>}
            <div className="assign-footer-right">
              <button type="button" className="btn-cancel" onClick={onClose}>Annulla</button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Salvataggio...' : isEdit ? 'Salva' : 'Assegna Turno'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignShiftModal;
