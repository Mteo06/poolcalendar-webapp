import React, { useState } from 'react';
import ShiftModal from './ShiftModal';
import './CalendarView.css';

const CalendarView = ({ shifts, companies, profile }) => {
  const [selectedShift, setSelectedShift] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  const groupShiftsByDate = () => {
    const grouped = {};
    const shiftsList = Array.isArray(shifts.shifts) ? shifts.shifts : [];
    
    shiftsList.forEach(shift => {
      const dateKey = new Date(shift.start_time).toLocaleDateString('it-IT');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(shift);
    });

    return grouped;
  };

  const groupedShifts = groupShiftsByDate();
  const shiftsList = Array.isArray(shifts.shifts) ? shifts.shifts : [];

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h1>I Miei Turni</h1>
        <button className="add-shift-btn" onClick={handleAddShift}>
          + Aggiungi Turno
        </button>
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
          {Object.keys(groupedShifts).sort((a, b) => {
            const dateA = a.split('/').reverse().join('-');
            const dateB = b.split('/').reverse().join('-');
            return new Date(dateA) - new Date(dateB);
          }).map(dateKey => (
            <div key={dateKey} className="date-group">
              <h3 className="date-header">{dateKey}</h3>
              
              {groupedShifts[dateKey].map(shift => {
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
                      {/* MOSTRA SOCIETÀ */}
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
