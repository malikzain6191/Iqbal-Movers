import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as cityApi from '../api/cityApi';
import { cityName } from '../utils/lookups';
import { CITY_NAME_PATTERN, PHONE_PATTERN, normalizeText, normalizedKey, optionalPhoneIsValid } from '../utils/validation';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Cities() {
  const { user } = useAuth();
  const { cities, terminals, refreshLookups } = useLookups();
  const [modal, setModal] = useState(null); // 'city' | 'terminal' | null
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');
  const canEdit = user.role === 'super_admin';

  async function saveCity() {
    const name = normalizeText(form.name || '');
    setErr('');
    if (cities.some((city) => normalizedKey(city.name) === normalizedKey(name))) {
      setErr('This city already exists.');
      return;
    }
    try {
      await cityApi.createCity(name);
      setModal(null); setForm({}); refreshLookups();
    } catch (error) {
      setErr(error.response?.data?.message || error.message);
    }
  }
  async function saveTerminal() {
    const name = normalizeText(form.name || '');
    const cityId = form.city_id || user.city_id || cities[0]?.id;
    setErr('');
    if (terminals.some((terminal) => String(terminal.city_id) === String(cityId) && normalizedKey(terminal.name) === normalizedKey(name))) {
      setErr('A terminal with this name already exists in the selected city.');
      return;
    }
    if (!optionalPhoneIsValid(form.phone || '')) {
      setErr('Enter a valid contact number.');
      return;
    }
    try {
      await cityApi.createTerminal({ name, city_id: cityId, address: normalizeText(form.address || ''), phone: (form.phone || '').trim() });
      setModal(null); setForm({}); refreshLookups();
    } catch (error) {
      setErr(error.response?.data?.message || error.message);
    }
  }

  return (
    <>
      <div className="ph">
        <div><h2>Cities & Terminals</h2><p>Organisational structure</p></div>
        {canEdit && <button className="btn" onClick={() => { setForm({ name: '' }); setErr(''); setModal('city'); }}>+ Add City</button>}
      </div>
      <div className="grid2">
        <div className="card">
          <div className="hd"><h3>Cities</h3></div>
          <div className="bd">
            <table><tbody>
              <tr><th>City</th><th>Terminals</th><th>Status</th></tr>
              {cities.map((c) => (
                <tr key={c.id}><td><b>{c.name}</b></td><td>{terminals.filter((t) => t.city_id === c.id).length}</td><td><StatusBadge status={c.status} /></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
        <div className="card">
          <div className="hd">
            <h3>Terminals</h3>
            {canEdit && <button className="btn sm" onClick={() => { setForm({ name: '', city_id: '' }); setErr(''); setModal('terminal'); }}>+ Add Terminal</button>}
          </div>
          <div className="bd">
            <table><tbody>
              <tr><th>Terminal</th><th>City</th><th>Phone</th><th>Status</th></tr>
              {terminals.map((t) => (
                <tr key={t.id}><td>{t.name}</td><td>{cityName(t.city_id, cities)}</td><td>{t.phone}</td><td><StatusBadge status={t.status} /></td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </div>

      {modal === 'city' && (
        <Modal title="Add City" onClose={() => setModal(null)} onConfirm={saveCity}>
          <div className="fld"><label>City Name</label><input autoFocus required maxLength={60} pattern={CITY_NAME_PATTERN} title="Use letters and spaces only." placeholder="Faisalabad" value={form.name || ''} onChange={(e) => setForm({ name: e.target.value })} /></div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
      {modal === 'terminal' && (
        <Modal title="Add Terminal" onClose={() => setModal(null)} onConfirm={saveTerminal}>
          <div className="fld"><label>Terminal Name</label><input autoFocus required maxLength={80} pattern="[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*" title="Use letters, numbers, spaces, apostrophes, and hyphens." placeholder="City Central Terminal" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="fld"><label>City</label>
            <select required value={form.city_id || (user.role === 'super_admin' ? '' : user.city_id)} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}>
              {user.role === 'super_admin' && <option value="">Select a city</option>}
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="fld"><label>Address</label><input maxLength={160} placeholder="Street address (optional)" value={form.address || ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
          <div className="fld"><label>Contact Number</label><input type="tel" pattern={PHONE_PATTERN} title="Enter a phone number with at least 7 digits." placeholder="+92 300 1234567 (optional)" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
