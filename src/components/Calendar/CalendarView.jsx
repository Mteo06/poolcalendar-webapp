import React, { useState } from 'react';
import ShiftModal from './ShiftModal';
import './CalendarView.css';
import { downloadICS } from '../../utils/icalExport';

const CalendarView = ({ shifts, companies, profile }) => {
  const [selectedShift, setSelectedShift] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPastShifts, setShowPastShifts] = useState(false);
  const [copied, setCopied] = useState(false);

  const getICalURL = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const userId = profile?.id;
    const token = profile?.ical_token;
    
    return `webcal://${supabaseUrl.replace('https://', '')}/functions/v1/ical-export?user=${userId}&token=${token}`;
  };

  const copyICalLink = () => {
    navigator.clipboard.writeText(getICalURL().replace('webcal://', 'https://'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setShowModal(true);
  };

  const handleAddShift = () => {
    setSelectedShift(null);
    setShowModal(true);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    if (isToday) return 'Oggi';
    if (isTomorrow) return 'Domani';

    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const groupShiftsByDate = (shiftsArray) => {
    const grouped = {};
    const now = new Date();
    
    shiftsArray.forEach(shift => {
      const shiftDate = new Date(shift.start_time);
      const dateKey = shiftDate.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: shiftDate,
          shifts: [],
          isPast: shiftDate < now && shiftDate.toDateString() !== now.toDateString()
        };
      }
      grouped[dateKey].shifts.push(shift);
    });

    return grouped;
  };

  const shiftsList = Array.isArray(shifts.shifts) ? shifts.shifts : [];
  const groupedShifts = groupShiftsByDate(shiftsList);
  
  const futureShifts = Object.entries(groupedShifts)
    .filter(([_, group]) => !group.isPast)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));
  
  const pastShifts = Object.entries(groupedShifts)
    .filter(([_, group]) => group.isPast)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]));

  const pastShiftsCount = pastShifts.reduce((sum, [_, group]) => sum + group.shifts.length, 0);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h1>I Miei Turni</h1>
        <div className="header-actions">
          <button className="add-shift-btn" onClick={handleAddShift}>
            + Aggiungi Turno
          </button>
        </div>
      </div>

      {shifts.loading ? (
        <div className="loading-message">Caricamento turni...</div>
      ) : shiftsList.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <h2>Nessun turno pianificato</h2>
          <p>Aggiungi il tuo primo turno cliccando sul pulsante sopra</p>
        </div>
      ) : (
        <div className="shifts-list">
          {/* PROSSIMI TURNI */}
          {futureShifts.length > 0 && (
            <div className="shifts-section">
              <h2 className="section-title">🔜 Prossimi Turni</h2>
              {futureShifts.map(([dateKey, group]) => (
                <div key={dateKey} className="date-group">
                  <h3 className="date-header">{formatDate(group.date)}</h3>
                  
                  {group.shifts.map(shift => {
                    const company = companies.getCompanyById(shift.company_id);
                    
                    return (
                      <div 
                        key={shift.id} 
                        className="shift-card"
                        onClick={() => handleShiftClick(shift)}
                      >
                        <div className="shift-time">
                          <span className="time-badge">{formatTime(shift.start_time)}</span>
                          <span className="time-separator">→</span>
                          <span className="time-badge">{formatTime(shift.end_time)}</span>
                        </div>

                        <div className="shift-details">
                          <div className="shift-row">
                            <span className="shift-label">🏢 Società:</span>
                            <span className="shift-company">{company?.name || 'N/A'}</span>
                          </div>

                          <div className="shift-row">
                            <span className="shift-label">🏊 Impianto:</span>
                            <span className="shift-value">{shift.facility}</span>
                          </div>
                          
                          <div className="shift-row">
                            <span className="shift-label">👔 Ruolo:</span>
                            <span className="shift-role">{shift.role}</span>
                          </div>

                          {shift.break_duration > 0 && (
                            <div className="shift-row">
                              <span className="shift-label">☕ Pausa:</span>
                              <span className="shift-value">{shift.break_duration} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* TURNI PASSATI */}
          {pastShifts.length > 0 && (
            <div className="shifts-section past-section">
              <button 
                className="past-shifts-toggle"
                onClick={() => setShowPastShifts(!showPastShifts)}
              >
                <span className="toggle-icon">{showPastShifts ? '▼' : '▶'}</span>
                <span className="toggle-text">
                  Turni Passati ({pastShiftsCount})
                </span>
              </button>

              {showPastShifts && (
                <div className="past-shifts-content">
                  {pastShifts.map(([dateKey, group]) => (
                    <div key={dateKey} className="date-group past-date-group">
                      <h3 className="date-header past-date">{formatDate(group.date)}</h3>
                      
                      {group.shifts.map(shift => {
                        const company = companies.getCompanyById(shift.company_id);
                        
                        return (
                          <div 
                            key={shift.id} 
                            className="shift-card past-shift-card"
                            onClick={() => handleShiftClick(shift)}
                          >
                            <div className="shift-time">
                              <span className="time-badge">{formatTime(shift.start_time)}</span>
                              <span className="time-separator">→</span>
                              <span className="time-badge">{formatTime(shift.end_time)}</span>
                            </div>

                            <div className="shift-details">
                              <div className="shift-row">
                                <span className="shift-label">🏢 Società:</span>
                                <span className="shift-company">{company?.name || 'N/A'}</span>
                              </div>

                              <div className="shift-row">
                                <span className="shift-label">🏊 Impianto:</span>
                                <span className="shift-value">{shift.facility}</span>
                              </div>
                              
                              <div className="shift-row">
                                <span className="shift-label">👔 Ruolo:</span>
                                <span className="shift-role">{shift.role}</span>
                              </div>

                              {shift.break_duration > 0 && (
                                <div className="shift-row">
                                  <span className="shift-label">☕ Pausa:</span>
                                  <span className="shift-value">{shift.break_duration} min</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ShiftModal
          shift={selectedShift}
          companies={companies}
          onClose={() => {
            setShowModal(false);
            setSelectedShift(null);
          }}
          onSave={async () => {
            await shifts.refreshShifts();
            setShowModal(false);
            setSelectedShift(null);
          }}
          onDelete={async () => {
            await shifts.refreshShifts();
            setShowModal(false);
            setSelectedShift(null);
          }}
        />
      )}
    </div>
  );
};

export default CalendarView;
