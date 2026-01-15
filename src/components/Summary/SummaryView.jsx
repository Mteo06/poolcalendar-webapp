import React, { useState, useEffect } from 'react';
import './SummaryView.css';

const SummaryView = ({ shifts, companies, profile }) => {
  const [period, setPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all'); // NUOVO: filtro società
  const [viewMode, setViewMode] = useState('combined'); // NUOVO: combined o separated
  const [summary, setSummary] = useState({
    totalHours: 0,
    totalEarnings: 0,
    byRole: {},
    byCompany: {} // NUOVO: riepilogo per società
  });

  useEffect(() => {
    calculateSummary();
  }, [shifts.shifts, period, selectedYear, selectedMonth, roleFilter, companyFilter, companies]);

  const calculateSummary = () => {
    const shiftsList = Array.isArray(shifts.shifts) ? shifts.shifts : [];
    
    const filteredShifts = shiftsList.filter(shift => {
      const shiftDate = new Date(shift.start_time);
      
      // Filtro periodo
      if (period === 'month') {
        if (shiftDate.getFullYear() !== selectedYear || shiftDate.getMonth() !== selectedMonth) {
          return false;
        }
      } else {
        if (shiftDate.getFullYear() !== selectedYear) {
          return false;
        }
      }

      // Filtro ruolo
      if (roleFilter !== 'all' && shift.role !== roleFilter) {
        return false;
      }

      // Filtro società
      if (companyFilter !== 'all' && shift.company_id !== companyFilter) {
        return false;
      }

      return true;
    });

    let totalHours = 0;
    let totalEarnings = 0;
    const byRole = {};
    const byCompany = {};

    filteredShifts.forEach(shift => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      const diffMs = end - start;
      const hours = diffMs / (1000 * 60 * 60);
      const breakHours = (shift.break_duration || 0) / 60;
      const workHours = Math.max(0, hours - breakHours);

      // Trova la società e la tariffa
      const company = companies.getCompanyById(shift.company_id);
      const hourlyRate = company?.roles?.[shift.role]?.hourly_rate || 0;
      const earnings = workHours * hourlyRate;

      totalHours += workHours;
      totalEarnings += earnings;

      // Per ruolo
      if (!byRole[shift.role]) {
        byRole[shift.role] = { hours: 0, earnings: 0, count: 0 };
      }
      byRole[shift.role].hours += workHours;
      byRole[shift.role].earnings += earnings;
      byRole[shift.role].count += 1;

      // Per società
      const companyName = company?.name || 'Sconosciuta';
      if (!byCompany[shift.company_id]) {
        byCompany[shift.company_id] = {
          name: companyName,
          hours: 0,
          earnings: 0,
          count: 0,
          byRole: {}
        };
      }
      byCompany[shift.company_id].hours += workHours;
      byCompany[shift.company_id].earnings += earnings;
      byCompany[shift.company_id].count += 1;

      // Per società > ruolo
      if (!byCompany[shift.company_id].byRole[shift.role]) {
        byCompany[shift.company_id].byRole[shift.role] = {
          hours: 0,
          earnings: 0,
          count: 0,
          rate: hourlyRate
        };
      }
      byCompany[shift.company_id].byRole[shift.role].hours += workHours;
      byCompany[shift.company_id].byRole[shift.role].earnings += earnings;
      byCompany[shift.company_id].byRole[shift.role].count += 1;
    });

    console.log('Summary calculated:', { totalHours, totalEarnings, byRole, byCompany });
    setSummary({ totalHours, totalEarnings, byRole, byCompany });
  };

  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Tutti i ruoli disponibili dalle società attive
  const allRoles = [...new Set(
    companies.activeCompanies.flatMap(c => 
      c.roles ? Object.keys(c.roles) : []
    )
  )];

  return (
    <div className="summary-view">
      <h1>Riepilogo Entrate</h1>

      {/* FILTRI */}
      <div className="summary-filters">
        <div className="filter-group">
          <label>Periodo</label>
          <div className="period-selector">
            <button
              className={`period-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Mese
            </button>
            <button
              className={`period-btn ${period === 'year' ? 'active' : ''}`}
              onClick={() => setPeriod('year')}
            >
              Anno
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Anno</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="filter-select"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {period === 'month' && (
          <div className="filter-group">
            <label>Mese</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="filter-select"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
        )}

        {/* NUOVO: Filtro Società */}
        <div className="filter-group">
          <label>Società</label>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tutte le società</option>
            {companies.activeCompanies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Ruolo</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tutti i ruoli</option>
            {allRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* NUOVO: Modalità visualizzazione */}
        <div className="filter-group">
          <label>Visualizzazione</label>
          <div className="period-selector">
            <button
              className={`period-btn ${viewMode === 'combined' ? 'active' : ''}`}
              onClick={() => setViewMode('combined')}
            >
              Totale
            </button>
            <button
              className={`period-btn ${viewMode === 'separated' ? 'active' : ''}`}
              onClick={() => setViewMode('separated')}
            >
              Per Società
            </button>
          </div>
        </div>
      </div>

      {/* CARDS RIEPILOGO */}
      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">Totale Stimato</div>
            <div className="card-value">€{summary.totalEarnings.toFixed(2)}</div>
          </div>
        </div>

        <div className="summary-card hours">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <div className="card-label">Ore Lavorate</div>
            <div className="card-value">{summary.totalHours.toFixed(1)}h</div>
          </div>
        </div>

        <div className="summary-card average">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">Tariffa Media</div>
            <div className="card-value">
              €{summary.totalHours > 0 ? (summary.totalEarnings / summary.totalHours).toFixed(2) : '0.00'}/h
            </div>
          </div>
        </div>

        <div className="summary-card companies">
          <div className="card-icon">🏢</div>
          <div className="card-content">
            <div className="card-label">Società Attive</div>
            <div className="card-value">{Object.keys(summary.byCompany).length}</div>
          </div>
        </div>
      </div>

      {/* VISUALIZZAZIONE COMBINATA */}
      {viewMode === 'combined' && (
        <div className="role-breakdown">
          <h2>Dettaglio per Ruolo</h2>
          
          {Object.keys(summary.byRole).length === 0 ? (
            <div className="empty-breakdown">
              <span className="empty-icon">📋</span>
              <p>Nessun dato disponibile per il periodo selezionato</p>
            </div>
          ) : (
            <div className="breakdown-list">
              {Object.entries(summary.byRole).map(([role, data]) => (
                <div key={role} className="breakdown-item">
                  <div className="breakdown-header">
                    <span className="breakdown-role">{role}</span>
                    <span className="breakdown-count">{data.count} turni</span>
                  </div>
                  
                  <div className="breakdown-stats">
                    <div className="stat">
                      <span className="stat-label">Ore:</span>
                      <span className="stat-value">{data.hours.toFixed(1)}h</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Guadagno:</span>
                      <span className="stat-value">€{data.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISUALIZZAZIONE SEPARATA PER SOCIETÀ */}
      {viewMode === 'separated' && (
        <div className="company-breakdown">
          <h2>Dettaglio per Società</h2>
          
          {Object.keys(summary.byCompany).length === 0 ? (
            <div className="empty-breakdown">
              <span className="empty-icon">🏢</span>
              <p>Nessun dato disponibile per il periodo selezionato</p>
            </div>
          ) : (
            <div className="company-breakdown-list">
              {Object.entries(summary.byCompany).map(([companyId, companyData]) => (
                <div key={companyId} className="company-breakdown-card">
                  <div className="company-breakdown-header">
                    <h3>{companyData.name}</h3>
                    <div className="company-totals">
                      <span className="company-hours">{companyData.hours.toFixed(1)}h</span>
                      <span className="company-earnings">€{companyData.earnings.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="company-meta">
                    <span>{companyData.count} turni</span>
                    <span>
                      Media: €{companyData.hours > 0 ? (companyData.earnings / companyData.hours).toFixed(2) : '0.00'}/h
                    </span>
                  </div>

                  {/* Dettaglio per ruolo all'interno della società */}
                  <div className="company-roles-breakdown">
                    {Object.entries(companyData.byRole).map(([role, roleData]) => (
                      <div key={role} className="company-role-item">
                        <div className="company-role-header">
                          <span className="company-role-name">{role}</span>
                          <span className="company-role-rate">€{roleData.rate.toFixed(2)}/h</span>
                        </div>
                        <div className="company-role-stats">
                          <span>{roleData.count} turni</span>
                          <span>{roleData.hours.toFixed(1)}h</span>
                          <span className="role-earnings">€{roleData.earnings.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SummaryView;
