import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    await login(username, password);
  }

  return (
    <div id="login">
      <form className="lbox" onSubmit={submit}>
        <h1>🚌 Iqbal Travels</h1>
        <p>Transportation Management System — sign in</p>
        <div className="fld">
          <label>Username</label>
          <input required autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="fld">
          <label>Password</label>
          <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}
