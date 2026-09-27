import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as userApi from '../api/userApi';
import { cityName, termName } from '../utils/lookups';
import { normalizeText, normalizedKey, PERSON_NAME_PATTERN, PHONE_PATTERN, USERNAME_PATTERN } from '../utils/validation';
import Modal from '../components/Modal';

const ROLE_LABEL = { super_admin: 'Super Admin', city_admin: 'City Admin', counter_operator: 'Counter Operator' };
const MODULES = ['Fleet', 'Driver', 'Route', 'Schedule', 'Booking', 'Reports', 'User'];

export default function Users() {
  const { user } = useAuth();
  const { cities, terminals } = useLookups();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: 'city_admin' });
  const [err, setErr] = useState('');

  function refresh() { userApi.listUsers().then((r) => setUsers(r.data)); }
  useEffect(refresh, []);

  async function save() {
    setErr('');
    const name = normalizeText(form.name || '');
    const username = (form.username || '').trim().toLowerCase();
    if (users.some((existing) => normalizedKey(existing.username) === normalizedKey(username))) {
      return setErr('That username is already in use. Choose another username.');
    }
    try {
      await userApi.createUser({
        name, username, password: form.password, phone: (form.phone || '').trim(),
        role: form.role,
        city_id: form.role === 'super_admin' ? null : form.city_id || cities[0]?.id,
        terminal_id: form.role === 'counter_operator' ? form.terminal_id || terminals[0]?.id : null
      });
      setModal(false); setForm({ role: 'city_admin' }); setErr(''); refresh();
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  }
  async function toggle(u) {
    try { await userApi.toggleUserStatus(u.id, user); refresh(); }
    catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="ph">
        <div><h2>Users & Permissions</h2><p>Role-based access control</p></div>
        <button className="btn" onClick={() => { setForm({ role: 'city_admin', name: '', username: '', password: '', phone: '', city_id: '', terminal_id: '' }); setErr(''); setModal(true); }}>+ Create User</button>
      </div>
      <div className="card"><div className="bd">
        <table><tbody>
          <tr><th>Name</th><th>Username</th><th>Role</th><th>Scope</th><th>Status</th><th></th></tr>
          {users.map((u) => (
            <tr key={u.id}>
              <td><b>{u.name}</b></td><td>{u.username}</td>
              <td><span className="tag">{ROLE_LABEL[u.role]}</span></td>
              <td>{u.city_id ? cityName(u.city_id, cities) : 'All Cities'}{u.terminal_id ? ' · ' + termName(u.terminal_id, terminals) : ''}</td>
              <td><span className={`badge ${u.status === 'Active' ? 'b-ok' : 'b-danger'}`}>{u.status}</span></td>
              <td><button className="btn sm gh" onClick={() => toggle(u)}>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>

      {modal && (
        <Modal title="Create User" onClose={() => setModal(false)} onConfirm={save} confirmLabel="Create User">
          <div className="grid2">
            <div className="fld"><label>Employee Name</label><input autoFocus required maxLength={80} pattern={PERSON_NAME_PATTERN} title="Use letters, spaces, apostrophes, and hyphens." placeholder="Amina Khan" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="fld"><label>Username</label><input required minLength={3} maxLength={30} pattern={USERNAME_PATTERN} title="Use 3-30 letters, numbers, dots, underscores, or hyphens." placeholder="amina.khan" autoComplete="off" value={form.username || ''} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
            <div className="fld"><label>Password</label><input type="password" required minLength={8} maxLength={72} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,72}" title="Use at least 8 characters, including a letter and a number." placeholder="At least 8 characters" autoComplete="new-password" value={form.password || ''} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="fld"><label>Phone</label><input type="tel" pattern={PHONE_PATTERN} title="Enter a phone number with at least 7 digits." placeholder="+92 300 1234567 (optional)" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="fld"><label>Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="city_admin">City Admin</option>
                <option value="counter_operator">Counter Operator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            {form.role !== 'super_admin' && (
              <div className="fld"><label>City</label>
                <select required value={form.city_id || ''} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}>
                  <option value="">Select a city</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {form.role === 'counter_operator' && (
              <div className="fld"><label>Terminal</label>
                <select required value={form.terminal_id || ''} onChange={(e) => setForm((f) => ({ ...f, terminal_id: e.target.value }))}>
                  <option value="">Select a terminal</option>
                  {terminals.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <label style={{ marginTop: 8 }}>Module Permissions</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12.5 }}>
            {MODULES.map((m) => (
              <label key={m} style={{ display: 'flex', gap: 5, alignItems: 'center', fontWeight: 500 }}>
                <input type="checkbox" defaultChecked style={{ width: 'auto' }} /> {m}
              </label>
            ))}
          </div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
