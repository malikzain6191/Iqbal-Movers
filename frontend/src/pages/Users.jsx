import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as userApi from '../api/userApi';
import { cityName, termName } from '../utils/lookups';
import { normalizeText, normalizedKey, PERSON_NAME_PATTERN, PHONE_PATTERN, USERNAME_PATTERN } from '../utils/validation';
import Modal from '../components/Modal';
import DataGrid from '../components/DataGrid';

const ROLE_LABEL = { super_admin: 'Super Admin', city_admin: 'City Admin', counter_operator: 'Counter Operator' };
const MODULES = ['Fleet', 'Driver', 'Route', 'Schedule', 'Booking', 'Reports', 'User'];

export default function Users() {
  const { user } = useAuth();
  const { cities, terminals } = useLookups();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: 'city_admin' });
  const [err, setErr] = useState('');
  const cityTerminals = terminals.filter((terminal) => String(terminal.city_id) === String(form.city_id));

  function refresh() { userApi.listUsers().then((r) => setUsers(r.data)); }
  useEffect(refresh, []);

  async function save() {
    setErr('');
    const name = normalizeText(form.name || '');
    const username = (form.username || '').trim().toLowerCase();
    const cityId = form.city_id || cities[0]?.id;
    const selectedTerminal = cityTerminals.find((terminal) => String(terminal.id) === String(form.terminal_id));
    if (form.role === 'counter_operator' && !selectedTerminal) {
      return setErr('Select a terminal in the selected city.');
    }
    if (users.some((existing) => normalizedKey(existing.username) === normalizedKey(username))) {
      return setErr('That username is already in use. Choose another username.');
    }
    try {
      await userApi.createUser({
        name, username, password: form.password, phone: (form.phone || '').trim(),
        role: form.role,
        city_id: form.role === 'super_admin' ? null : cityId,
        terminal_id: form.role === 'counter_operator' ? selectedTerminal.id : null
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
        <DataGrid
          data={users}
          columns={[
            { accessorKey: 'name', header: 'Name', cell: ({ row }) => <b>{row.original.name}</b> },
            { accessorKey: 'username', header: 'Username' },
            { id: 'role', header: 'Role', accessorFn: (account) => ROLE_LABEL[account.role], cell: ({ row }) => <span className="tag">{ROLE_LABEL[row.original.role]}</span> },
            { id: 'scope', header: 'Scope', accessorFn: (account) => `${account.city_id ? cityName(account.city_id, cities) : 'All Cities'}${account.terminal_id ? ` · ${termName(account.terminal_id, terminals)}` : ''}` },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={`badge ${row.original.status === 'Active' ? 'b-ok' : 'b-danger'}`}>{row.original.status}</span> },
            { id: 'actions', header: '', enableSorting: false, enableColumnFilter: false, cell: ({ row }) => <button className="btn sm gh" onClick={() => toggle(row.original)}>{row.original.status === 'Active' ? 'Deactivate' : 'Activate'}</button> }
          ]}
        />
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
                <select required value={form.city_id || ''} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value, terminal_id: '' }))}>
                  <option value="">Select a city</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {form.role === 'counter_operator' && (
              <div className="fld"><label>Terminal</label>
                <select required value={form.terminal_id || ''} disabled={!form.city_id || cityTerminals.length === 0} onChange={(e) => setForm((f) => ({ ...f, terminal_id: e.target.value }))}>
                  <option value="">Select a terminal</option>
                  {cityTerminals.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
