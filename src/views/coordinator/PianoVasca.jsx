import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AssignShiftModal from './AssignShiftModal';
import './PianoVasca.css';

const START_HOUR  = 5;
const END_HOUR    = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS       = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR);
const COLORS      = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const ALL_FACILITIES = ['COZZI','CARDANO','SAINI','LIDO','PONZIO'];

const fmt     = (h)  => `${String(h).padStart(2,'0')}:00`;
const fmtTime = (dt) => new Date(dt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});

const getStyle = (shift) => {
  const s  = new Date(shift.start_time);
  const e  = new Date(shift.end_time);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  return {
    left:  `${Math.max(0, (sh - START_HOUR) / TOTAL_HOURS * 100)}%`,
    width: `${Math.max(0.5, (eh - sh) / TOTAL_HOURS * 100)}%`,
  };
};

const PianoVasca = ({ user, workers, isCoordinator = false, readOnly = false }) => {
  const [selectedDate,     setSelectedDate]     = useState(new Date());
  const [selectedFacility, setSelectedFacility] = useState(ALL_FACILITIES[0]);
  const [shifts,           setShifts]           = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [showModal,        setShowModal]        = useState(false);
  const [selectedSlot,     setSelectedSlot]     = useState(null);
  const [selectedShift,    setSelectedShift]    = useState(null);
  const [profiles,         setProfiles]         = useState([]);

  const dateStr = selectedDate.toISOString().split('T')[0];

  useEffect(() => { fetchShifts(); },  [selectedDate, selectedFacility, workers]);
  useEffect(() => { fetchProfiles(); }, [workers]);

  const fetchProfiles = async () => {
    if (!workers?.length) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('id,username,full_name,email,phone,birth_date')
      .in('id', workers.map(w => w.id));
    setProfiles(data || []);
  };

  const fetchShifts = async () => {
    if (!workers?.length) { setShifts([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shifts').select('*')
        .in('user_id', workers.map(w => w.id))
        .eq('facility', selectedFacility)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`);
      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProfile = (id) => profiles.find(p => p.id === id) || workers?.find(w => w.id === id) || {};

  const handleTimelineClick = (e, workerId) => {
    if (readOnly || !isCoordinator) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = Math.floor((e.clientX - rect.left) / rect.width * TOTAL_HOURS + START_HOUR);
    setSelectedSlot({ hour, workerId });
    setSelectedShift(null);
    setShowModal(true);
  };

  const handleShiftClick = (e, shift) => {
    e.stopPropagation();
    if (readOnly) return;
    setSelectedShift(shift);
    setSelectedSlot(null);
    setShowModal(true);
  };

  const changeDay = (d) => {
    const nd = new Date(selectedDate);
    nd.setDate(nd.getDate() + d);
    setSelectedDate(nd);
  };

  const dayLabel = selectedDate.toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  return (
    <div className="piano-vasca">
      <div className="pv-toolbar">
        <div className="pv-toolbar-left">
          <h2 className="pv-title">📅 Piano Vasca</h2>
          <div className="pv-facilities">
            {ALL_FACILITIES.map(f => (
              <button key={f} onClick={() => setSelectedFacility(f)}
                className={`pv-facility-btn ${selectedFacility === f ? 'active' : ''}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="pv-toolbar-right">
          <div className="pv-date-nav">
            <button className="pv-day-btn" onClick={() => changeDay(-1)}>‹</button>
            <input type="date" className="pv-date-input" value={dateStr}
              onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} />
            <button className="pv-day-btn" onClick={() => changeDay(1)}>›</button>
          </div>
        </div>
      </div>

      <div className="pv-infobar">
        <span className="pv-daylabel">{dayLabel}</span>
        <span>Impianto: <strong>{selectedFacility}</strong></span>
        {isCoordinator && !readOnly && <span className="pv-hint">💡 Clicca sulla riga per assegnare un turno</span>}
      </div>

      <div className="pv-wrapper">
        <div className="pv-header-row">
          <div className="pv-name-col"></div>
          <div className="pv-timeline-col">
            {HOURS.map(h => (
              <div key={h} className="pv-hour-label"
                style={{ left: `${(h - START_HOUR) / TOTAL_HOURS * 100}%` }}>{fmt(h)}</div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="pv-loading">Caricamento...</div>
        ) : !workers?.length ? (
          <div className="pv-empty">⚠️ Nessun lavoratore. Vai su "Lavoratori" per aggiungerne.</div>
        ) : (
          workers.map((worker, idx) => {
            const info         = getProfile(worker.id);
            const workerShifts = shifts.filter(s => s.user_id === worker.id);
            const color        = COLORS[idx % COLORS.length];
            return (
              <div key={worker.id} className="pv-row">
                <div className="pv-name-col">
                  <div className="pv-worker-name">{info.full_name || info.username}</div>
                </div>
                <div className={`pv-timeline ${isCoordinator && !readOnly ? 'clickable' : ''}`}
                  onClick={(e) => handleTimelineClick(e, worker.id)}>
                  {HOURS.map(h => (
                    <div key={h} className="pv-vline"
                      style={{ left: `${(h - START_HOUR) / TOTAL_HOURS * 100}%` }} />
                  ))}
                  {workerShifts.map(shift => (
                    <div key={shift.id}
                      className={`pv-shift ${readOnly ? 'readonly' : 'editable'}`}
                      style={{ ...getStyle(shift), background: color }}
                      onClick={(e) => handleShiftClick(e, shift)}
                      title={`${shift.role} | ${fmtTime(shift.start_time)}–${fmtTime(shift.end_time)}`}>
                      <span className="pv-shift-label">
                        {shift.role} {fmtTime(shift.start_time)}–{fmtTime(shift.end_time)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && isCoordinator && !readOnly && (
        <AssignShiftModal
          user={user} workers={workers}
          selectedSlot={selectedSlot} selectedShift={selectedShift}
          selectedDate={selectedDate} selectedFacility={selectedFacility}
          onClose={() => { setShowModal(false); setSelectedShift(null); setSelectedSlot(null); }}
          onSave={() => { setShowModal(false); fetchShifts(); }}
        />
      )}
    </div>
  );
};

export default PianoVasca;
