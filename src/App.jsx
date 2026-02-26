import React from 'react';
import { useAuth } from './hooks/useAuth';

function App() {
  const auth = useAuth();

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h2>DEBUG AUTH</h2>
      <p><b>loading:</b> {String(auth.loading)}</p>
      <p><b>user:</b> {auth.user?.email || 'null'}</p>
      <p><b>emailConfirmed:</b> {String(auth.emailConfirmed)}</p>
      <p><b>profile:</b> {auth.profile ? JSON.stringify(auth.profile) : 'null'}</p>
      <p><b>isAuthenticated:</b> {String(auth.isAuthenticated)}</p>
    </div>
  );
}

export default App;
