import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PianoVasca from './PianoVasca';
import WorkersList from './WorkersList';
import WorkerEarnings from './WorkerEarnings';
import './CoordinatorDashboard.css';

const CoordinatorDashboard = ({ user, profile, onSignOut }) => {
  const [activeView, setActiveView] = useState('piano');
  const [workers,    setWorkers]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchWorkers(); }, []);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('coordinator_workers')
        .select('worker:user_profiles!coordinator_workers_worker_id_fkey(id,username,full_name,email,phone,birth_date,role)')
        .eq('coordinator_id', user.id);
      if (error) throw error;
      setWorkers(data?.map(d => d.worker).filter(Boolean) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async (email) => {
    try {
      const { data: found, error } = await supabase
        .from('user_profiles').select('id,username,full_name,email,role').eq('email', email).single();
      if (error || !found) return { success: false, error: 'Utente non trovato.' };
      if (found.role !== 'worker') return { success: false, error: "L'utente non è un Lavoratore." };
      const { error: insErr } = await supabase
        .from('coordinator_workers').insert({ coordinator_id: user.id, worker_id: found.id });
      if (insErr) {
        if (insErr.code === '23505') return { success: false, error: 'Lavoratore già aggiunto.' };
        throw insErr;
      }
      await fetchWorkers();
      return { success: true, name: found.full_name || found.username };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const removeWorker = async (workerId) => {
    try {
      const { error } = await supabase.from('coordinator_workers')
        .delete().eq('coordinator_id', user.id).eq('worker_id', workerId);
      if (error) throw error;
      await fetchWorkers();
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  const navItems = [
    { id: 'piano',    icon: '📅', label: 'Piano Vasca' },
    { id: 'workers',  icon: '👥', label: 'Lavoratori'  },
    { id: 'earnings', icon: '💰', label: 'Guadagni'    },
    { id: 'profile',  icon: '👤', label: 'Profilo'     },
  ];

  return (
    <div className="coordinator-app">
      <header className="coordinator-header">
        <div className="header-left">
          <span className="header-logo">🏊 PoolCalendar</span>
          <span className="header-role-badge">📋 Coordinatore</span>
        </div>
        <div className="header-right">
          <span className="header-username">{profile?.full_name || profile?.username}</span>
          <button className="btn-signout" onClick={onSignOut}>Esci</button>
        </div>
      </header>

      <nav className="coordinator-nav">
        {navItems.map(item => (
          <button key={item.id}
            className={`coord-nav-btn ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="coordinator-main">
        {loading ? (
          <div className="coord-loading"><div className="spinner"></div><p>Caricamento...</p></div>
        ) : (
          <>
            {activeView === 'piano'    && <PianoVasca user={user} workers={workers} isCoordinator={true} />}
            {activeView === 'workers'  && <WorkersList workers={workers} onAddWorker={addWorker} onRemoveWorker={removeWorker} />}
            {activeView === 'earnings' && <WorkerEarnings user={user} workers={workers} />}
            {activeView === 'profile'  && (
              <div className="coord-profile-page">
                <h2>👤 Il mio Profilo</h2>
                <div className="coord-profile-card">
                  <div className="profile-row"><span>Nome</span><strong>{profile?.full_name || '—'}</strong></div>
                  <div className="profile-row"><span>Username</span><strong>{profile?.username}</strong></div>
                  <div className="profile-row"><span>Email</span><strong>{user?.email}</strong></div>
                  <div className="profile-row"><span>Ruolo</span><strong>📋 Coordinatore</strong></div>
                  <div className="profile-row"><span>Lavoratori gestiti</span><strong>{workers.length}</strong></div>
                </div>
                <button className="btn-logout-full" onClick={onSignOut}>🚪 Esci</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CoordinatorDashboard;
