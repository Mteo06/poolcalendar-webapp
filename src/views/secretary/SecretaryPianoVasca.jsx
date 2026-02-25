import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './SecretaryDashboard.css';

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

const SecretaryPianoVasca = ({ workers }) => {
  const [selectedDate,     setSelectedDate]     = useState(new Date());
  const [selectedFacility, setSelectedFacility] = useState(ALL_FACILITIES[0]);
  const [shifts,           setShifts]           = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [expandedWorker,   setExpandedWorker]   = useState(null);

  const dateStr = selectedDate.toISOString().split('T')[0];

  useEffect(() => { fetchShifts(); }, [selectedDate, selectedFacility, workers]);

  const fetchShifts = async () => {
    if (!workers?.length) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('shifts').select('*')
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
          <h2 className="pv-title">🗂️ Piano Vasca</h2>
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
        <span className="secretary-readonly-badge">👁️ Sola lettura</span>
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

        {loading ? <div className="pv-loading">Caricamento...</div> : (
          workers.map((worker, idx) => {
            const workerShifts = shifts.filter(s => s.user_id === worker.id);
            const color        = COLORS[idx % COLORS.length];
            const isExpanded   = expandedWorker === worker.id;
            return (
              <div key={worker.id} className={`pv-row ${isExpanded ? 'expanded' : ''}`}>
                <div className="pv-name-col"
                  onClick={() => setExpandedWorker(isExpanded ? null : worker.id)}
                  style={{ cursor: 'pointer' }}>
                  <div className="pv-worker-name">{worker.full_name || worker.username}</div>
                  {isExpanded && (
                    <div className="pv-worker-contacts">
                      {worker.email      && <span>✉️ {worker.email}</span>}
                      {worker.phone      && <span>📞 {worker.phone}</span>}
                      {worker.birth_date && <span>🎂 {new Date(worker.birth_date).toLocaleDateString('it-IT')}</span>}
                    </div>
                  )}
                  <span style={{ fontSize: '10px', color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                <div className="pv-timeline readonly">
                  {HOURS.map(h => (
                    <div key={h} className="pv-vline"
                      style={{ left: `${(h - START_HOUR) / TOTAL_HOURS * 100}%` }} />
                  ))}
                  {workerShifts.map(shift => (
                    <div key={shift.id} className="pv-shift readonly"
                      style={{ ...getStyle(shift), background: color }}
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
    </div>
  );
};

export default SecretaryPianoVasca;
