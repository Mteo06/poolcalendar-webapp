import React from 'react';
import './Navigation.css';

const Navigation = ({ activeView, onNavigate }) => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <h1 className="nav-logo">PoolCalendar</h1>
        
        <div className="nav-links">
          <button
            className={`nav-link ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => onNavigate('calendar')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Calendario</span>
          </button>

          <button
            className={`nav-link ${activeView === 'summary' ? 'active' : ''}`}
            onClick={() => onNavigate('summary')}
          >
            <span className="nav-icon">💰</span>
            <span className="nav-text">Riepilogo</span>
          </button>

          <button
            className={`nav-link ${activeView === 'profile' ? 'active' : ''}`}
            onClick={() => onNavigate('profile')}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-text">Profilo</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
