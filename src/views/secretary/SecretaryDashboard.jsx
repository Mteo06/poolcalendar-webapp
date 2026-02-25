import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SecretaryPianoVasca from './SecretaryPianoVasca';
import './SecretaryDashboard.css';

const SecretaryDashboard = ({ user, profile, onSignOut }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllWorkers(); }, []);

  const fetchAllWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id,username,full_name,email,phone,birth_date')
        .eq('role', 'worker');
      if (error) throw error;
      setWorkers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secretary-app">
      <header className="secretary-header">
        <div className="header-left">
          <span className="header-logo">🏊 PoolCalendar</span>
          <span className="header-role-badge secretary-badge">🗂️ Segreteria</span>
        </div>
        <div className="header-right">
          <span className="header-username">{profile?.full_name || profile?.username}</span>
          <button className="btn-signout" onClick={onSignOut}>Esci</button>
        </div>
      </header>
      <main className="secretary-main">
        {loading ? <div className="secretary-loading">Caricamento...</div>
          : <SecretaryPianoVasca workers={workers} />}
      </main>
    </div>
  );
};

export default SecretaryDashboard;
