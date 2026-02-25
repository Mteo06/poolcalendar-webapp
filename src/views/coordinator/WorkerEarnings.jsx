import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './WorkerEarnings.css';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const WorkerEarnings = ({ user, workers }) => {
  const now = new Date();
  const [month,      setMonth]      = useState(now.getMonth());
  const [year,       setYear]       = useState(now.getFullYear());
  const [earnings,   setEarnings]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { if (workers?.length) fetchEarnings(); }, [workers, month, year]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { data: shifts } = await supabase.from('shifts').select('*')
        .in('user_id', workers.map(w => w.id))
        .gte('start_time', start).lte('start_time', end);
      const { data: companies } = await supabase.from('companies').select('user_id,roles')
        .in('user_id', workers.map(w => w.id));

      const result = workers.map(worker => {
        const ws = shifts?.filter(s => s.user_id === worker.id) || [];
        const wc = companies?.filter(c => c.user_id === worker.id) || [];
        const getRate = (role) => {
          for (const c of wc) {
            if (c.roles?.[role]?.hourly_rate) return Number(c.roles[role].hourly_rate);
          }
          return 0;
        };
        let total = 0;
        const details = ws.map(s => {
          const hours  = (new Date(s.end_time) - new Date(s.start_time)) / 3600000 - (s.break_duration || 0) / 60;
          const rate   = getRate(s.role);
          const earned = hours * rate;
          total += earned;
          return { ...s, hours: hours.toFixed(2), rate, earned: earned.toFixed(2) };
        });
        return { worker, total: total.toFixed(2), count: ws.length, shifts: details };
      });
      setEarnings(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = earnings.reduce((s, e) => s + parseFloat(e.total), 0);

  return (
    <div className="earnings-page">
      <h2>💰 Guadagni Lavoratori</h2>
      <div className="earnings-filter">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {loading ? <div className="earnings-loading">Calcolo...</div> : (
        <>
          <div className="earnings-total-banner">
            <span>Totale {MONTHS[month]} {year}</span>
            <strong>€ {grandTotal.toFixed(2)}</strong>
          </div>
          <div className="earnings-cards">
            {earnings.map(({ worker, total, count, shifts }) => (
              <div key={worker.id} className="earnings-card">
                <div className="earnings-card-header"
                  onClick={() => setExpandedId(expandedId === worker.id ? null : worker.id)}>
                  <div className="earnings-worker-info">
                    <div className="earnings-avatar">{(worker.full_name || worker.username || '?')[0].toUpperCase()}</div>
                    <div><h4>{worker.full_name || worker.username}</h4><span>{count} turni</span></div>
                  </div>
                  <div className="earnings-amount">
                    <span>€ {total}</span>
                    <span>{expandedId === worker.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === worker.id && (
                  <div className="earnings-details">
                    {shifts.length === 0 ? <p className="no-shifts">Nessun turno.</p> : (
                      <table className="shifts-table">
                        <thead><tr><th>Data</th><th>Ruolo</th><th>Impianto</th><th>Ore</th><th>€/h</th><th>Totale</th></tr></thead>
                        <tbody>
                          {shifts.map(s => (
                            <tr key={s.id}>
                              <td>{new Date(s.start_time).toLocaleDateString('it-IT')}</td>
                              <td>{s.role}</td><td>{s.facility}</td>
                              <td>{s.hours}h</td><td>€ {s.rate}</td>
                              <td><strong>€ {s.earned}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr><td colSpan={5}><strong>Totale mese</strong></td><td><strong>€ {total}</strong></td></tr></tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkerEarnings;
