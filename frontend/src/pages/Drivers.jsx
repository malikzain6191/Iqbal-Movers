import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as driverApi from '../api/driverApi';
import { cityName, today } from '../utils/lookups';
import { normalizeText, normalizedKey, optionalPhoneIsValid, PERSON_NAME_PATTERN, PHONE_PATTERN } from '../utils/validation';
import Modal from '../components/Modal';

export default function Drivers() {
  const { user } = useAuth();
  const { cities, refreshLookups } = useLookups();
  const [drivers, setDrivers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');

  function refresh() { driverApi.listDrivers().then((r) => setDrivers(r.data)); }
  useEffect(refresh, [user]);

  async function save() {
    setErr('');
    const name = normalizeText(form.name || '');
    const cnicDigits = (form.cnic || '').replace(/\D/g, '');
    const licenseNumber = (form.license_number || '').trim();
    if (!/^\d{13}$/.test(cnicDigits)) return setErr('CNIC must contain 13 digits.');
    if (!/^[A-Za-z0-9][A-Za-z0-9/-]{2,29}$/.test(licenseNumber)) return setErr('Enter a valid license number.');
    if (form.license_expiry_date < today(1)) return setErr('License expiry date must be in the future.');
    if (!optionalPhoneIsValid(form.phone || '')) return setErr('Enter a valid phone number.');
    if (drivers.some((driver) => driver.cnic?.replace(/\D/g, '') === cnicDigits || normalizedKey(driver.license_number || '') === normalizedKey(licenseNumber))) {
      return setErr('That CNIC or license number is already registered.');
    }
    try {
      const cnic = `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}`;
      await driverApi.createDriver({ ...form, name, cnic, license_number: licenseNumber, phone: (form.phone || '').trim(), city_id: form.city_id || user.city_id || cities[0]?.id });
      setModal(false); setForm({}); refresh(); refreshLookups();
    } catch (error) {
      setErr(error.response?.data?.message || error.message);
    }
  }
  async function toggle(d) { await driverApi.toggleDriverStatus(d.id); refresh(); refreshLookups(); }

  return (
    <>
      <div className="ph">
        <div><h2>Driver Management</h2><p>Driver registration & licensing</p></div>
        <button className="btn" onClick={() => { setForm({ name: '', cnic: '', phone: '', city_id: user.city_id || '', license_number: '', license_expiry_date: '' }); setErr(''); setModal(true); }}>+ Add Driver</button>
      </div>
      <div className="card"><div className="bd">
        <table><tbody>
          <tr><th>Name</th><th>CNIC</th><th>City</th><th>License Expiry</th><th>Status</th><th></th></tr>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td><b>{d.name}</b></td><td>{d.cnic}</td><td>{cityName(d.city_id, cities)}</td><td>{d.license_expiry_date}</td>
              <td><span className={`badge ${d.status === 'Active' ? 'b-ok' : 'b-danger'}`}>{d.status}</span></td>
              <td><button className="btn sm gh" onClick={() => toggle(d)}>{d.status === 'Active' ? 'Suspend' : 'Reactivate'}</button></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>

      {modal && (
        <Modal title="Add Driver" onClose={() => setModal(false)} onConfirm={save}>
          <div className="grid2">
            <div className="fld"><label>Driver Name</label><input autoFocus required maxLength={80} pattern={PERSON_NAME_PATTERN} title="Use letters, spaces, apostrophes, and hyphens." placeholder="Ahmed Khan" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="fld"><label>CNIC</label><input required pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" title="Enter 13 digits, optionally formatted as 12345-1234567-1." placeholder="35202-1234567-1" value={form.cnic || ''} onChange={(e) => setForm((f) => ({ ...f, cnic: e.target.value }))} /></div>
            <div className="fld"><label>Phone</label><input type="tel" pattern={PHONE_PATTERN} title="Enter a phone number with at least 7 digits." placeholder="0300 1234567 (optional)" value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="fld"><label>City</label>
              <select required disabled={user.role !== 'super_admin'} value={form.city_id || (user.role === 'super_admin' ? '' : user.city_id)} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}>
                {user.role === 'super_admin' && <option value="">Select a city</option>}
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fld"><label>License Number</label><input required minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9/-]{2,29}" placeholder="LHR-DL-001" value={form.license_number || ''} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))} /></div>
            <div className="fld"><label>License Expiry</label><input required type="date" min={today(1)} value={form.license_expiry_date || ''} onChange={(e) => setForm((f) => ({ ...f, license_expiry_date: e.target.value }))} /></div>
          </div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
