import React, { useState } from 'react';
import ShiftModal from './ShiftModal';
import './CalendarView.css';
import { downloadICS } from '../../utils/icalExport';

const CalendarView = ({ shifts, companies, profile }) => {
  const [selectedShift, setSelectedShift] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPastShifts, setShowPastShifts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

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

  const handleDayClick = (day, dayShifts) => {
    if (dayShifts.length > 0) {
      setSelectedDay({ date: day, shifts: dayShifts });
      setShowDayModal(true);
    }
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
      month: 'long',
      year: 'numeric'
    });
  };


  const groupShiftsByDate = (shiftsArray) => {
    const grouped = {};
    const now = new Date();
    
    shiftsArray.forEach(shift => {
      const shiftDate = new Date(shift.start_time);
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const day = String(shiftDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
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

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
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

  const DayModal = () => {
    if (!selectedDay) return null;

    const dayName = selectedDay.date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
        <div className="day-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="day-modal-header">
            <h2>{dayName}</h2>
            <button className="close-btn" onClick={() => setShowDayModal(false)}>×</button>
          </div>

          <div className="day-modal-body">
            <p className="day-modal-subtitle">
              {selectedDay.shifts.length} {selectedDay.shifts.length === 1 ? 'turno' : 'turni'} in questo giorno
            </p>

            <div className="day-shifts-list">
              {selectedDay.shifts
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .map(shift => {
                  const company = companies.getCompanyById(shift.company_id);
                  
                  return (
                    <div 
                      key={shift.id} 
                      className="day-shift-card"
                      onClick={() => {
                        setShowDayModal(false);
                        handleShiftClick(shift);
                      }}
                    >
                      <div className="day-shift-header">
                        <div className="day-shift-time">
                          <span className="time-badge-large">{formatTime(shift.start_time)}</span>
                          <span className="time-separator">→</span>
                          <span className="time-badge-large">{formatTime(shift.end_time)}</span>
                        </div>
                        <span className="day-shift-role-badge">{shift.role}</span>
                      </div>

                      <div className="day-shift-details">
                        <div className="detail-row">
                          <span className="detail-icon">🏢</span>
                          <span className="detail-label">Società:</span>
                          <span className="detail-value">{company?.name || 'N/A'}</span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-icon">🏊</span>
                          <span className="detail-label">Impianto:</span>
                          <span className="detail-value">{shift.facility}</span>
                        </div>

                        {shift.break_duration > 0 && (
                          <div className="detail-row">
                            <span className="detail-icon">☕</span>
                            <span className="detail-label">Pausa:</span>
                            <span className="detail-value">{shift.break_duration} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="day-modal-footer">
            <button 
              className="btn-add-shift-day" 
              onClick={() => {
                setShowDayModal(false);
                handleAddShift();
              }}
            >
              + Aggiungi Turno
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    const calendarDays = generateCalendarDays();
    const today = new Date();
    const monthName = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    return (
      <div className="calendar-grid-view">
        <div className="month-navigation">
          <button className="nav-btn" onClick={goToPreviousMonth}>◀</button>
          <h2 className="month-title">{monthName}</h2>
          <button className="nav-btn" onClick={goToNextMonth}>▶</button>
        </div>
        <button className="today-btn" onClick={goToToday}>Oggi</button>
        
        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="calendar-header-day">{day}</div>
          ))}
          
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="calendar-day empty"></div>;
            }

            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const dayNum = String(day.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${dayNum}`;
            
            const dayShifts = groupedShifts[dateKey]?.shifts || [];
            const isToday = day.toDateString() === today.toDateString();
            const isPast = day < today && day.toDateString() !== today.toDateString();

            return (
              <div
                key={dateKey}
                className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${dayShifts.length > 0 ? 'has-shifts' : ''}`}
                onClick={() => handleDayClick(day, dayShifts)}
              >
                <div className="day-number">{day.getDate()}</div>
                
                {dayShifts.length > 0 && (
                  <div className="day-shifts" onClick={(e) => e.stopPropagation()}>
                    {dayShifts.slice(0, 3).map(shift => {
                      const company = companies.getCompanyById(shift.company_id);
                      return (
                        <div
                          key={shift.id}
                          className="day-shift-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftClick(shift);
                          }}
                        >
                          <span className="shift-time-mini">{formatTime(shift.start_time)}</span>
                          <span className="shift-role-mini">{shift.role}</span>
                          <span className="shift-facility-mini">{shift.facility}</span>
                        </div>
                      );
                    })}
                    
                    {dayShifts.length > 3 && (
                      <div 
                        className="more-shifts-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day, dayShifts);
                        }}
                      >
                        +{dayShifts.length - 3} altri
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="shifts-list">
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
  );

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h1>I Miei Turni</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              📅 Calendario
            </button>
          </div>
          
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
        <>
          {viewMode === 'list' ? renderListView() : renderGridView()}
        </>
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

      {showDayModal && <DayModal />}
    </div>
  );
};

export default CalendarView;