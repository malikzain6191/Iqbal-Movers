import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QUICK = [
  { label: 'Super Admin', u: 'superadmin', p: 'super123' },
  { label: 'City Admin (Faisalabad)', u: 'fsd.admin', p: 'city123' },
  { label: 'Counter Operator', u: 'counter1', p: 'count123' }
];

export default function Login() {
  const { user, login, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [picked, setPicked] = useState(null);

  if (user) return <Navigate to="/dashboard" replace />;

  function quickFill(q, idx) {
    setUsername(q.u);
    setPassword(q.p);
    setPicked(idx);
  }

  async function submit(e) {
    e.preventDefault();
    await login(username, password);
  }

  return (
    <div id="login">
      <form className="lbox" onSubmit={submit}>
        <h1>🚌 Iqbal Travels</h1>
        <p>Transportation Management System — sign in</p>
        <div className="roles">
          {QUICK.map((q, i) => (
            <div key={q.u} className={`rolebtn ${picked === i ? 'on' : ''}`} onClick={() => quickFill(q, i)}>
              {q.label}
            </div>
          ))}
        </div>
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
