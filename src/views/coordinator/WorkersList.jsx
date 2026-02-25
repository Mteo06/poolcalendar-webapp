import React, { useState } from 'react';
import './WorkersList.css';

const WorkersList = ({ workers, onAddWorker, onRemoveWorker }) => {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    const result = await onAddWorker(email.trim());
    setMessage(result.success
      ? { type: 'success', text: `✅ ${result.name} aggiunto!` }
      : { type: 'error',   text: `❌ ${result.error}` }
    );
    if (result.success) setEmail('');
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleRemove = async (worker) => {
    if (!window.confirm(`Rimuovere ${worker.full_name || worker.username}?`)) return;
    const result = await onRemoveWorker(worker.id);
    if (!result.success) setMessage({ type: 'error', text: result.error });
  };

  return (
    <div className="workers-list-page">
      <h2>👥 Gestione Lavoratori</h2>
      <p className="workers-subtitle">
        Aggiungi lavoratori tramite email. Devono essere registrati come <strong>Lavoratore</strong>.
      </p>
      <div className="add-worker-section">
        <h3>➕ Aggiungi Lavoratore</h3>
        <form onSubmit={handleAdd} className="add-worker-form">
          <input type="email" value={email} placeholder="email@esempio.it" required
            onChange={e => setEmail(e.target.value)} />
          <button type="submit" disabled={loading}>{loading ? 'Ricerca...' : 'Aggiungi'}</button>
        </form>
        {message.text && <div className={`workers-message ${message.type}`}>{message.text}</div>}
      </div>
      <div className="workers-section">
        <h3>📋 Lavoratori ({workers.length})</h3>
        {workers.length === 0 ? (
          <div className="workers-empty"><span>🔍</span><p>Nessun lavoratore ancora.</p></div>
        ) : (
          <div className="workers-cards">
            {workers.map(worker => (
              <div key={worker.id} className="worker-card">
                <div className="worker-avatar">
                  {(worker.full_name || worker.username || '?')[0].toUpperCase()}
                </div>
                <div className="worker-info">
                  <h4>{worker.full_name || worker.username}</h4>
                  {worker.full_name && <p className="worker-username">@{worker.username}</p>}
                  <p>✉️ {worker.email}</p>
                  {worker.phone      && <p>📞 {worker.phone}</p>}
                  {worker.birth_date && <p>🎂 {new Date(worker.birth_date).toLocaleDateString('it-IT')}</p>}
                </div>
                <button className="btn-remove-worker" onClick={() => handleRemove(worker)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkersList;
