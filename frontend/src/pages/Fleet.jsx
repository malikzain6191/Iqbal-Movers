import { useEffect, useState } from 'react';
import { useLookups } from '../context/LookupsContext';
import * as fleetApi from '../api/fleetApi';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { normalizeText, normalizedKey } from '../utils/validation';

const CYCLE = ['Active', 'Under Maintenance', 'Inactive'];

export default function Fleet() {
  const { refreshLookups } = useLookups();
  const [vehicles, setVehicles] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vehicle_type: 'AC Coach', seating_capacity: 36 });
  const [err, setErr] = useState('');

  function refresh() { fleetApi.listVehicles().then((r) => setVehicles(r.data)); }
  useEffect(refresh, []);

  async function save() {
    setErr('');
    const vehicleNumber = (form.vehicle_number || '').trim().toUpperCase();
    const registrationNumber = (form.registration_number || '').trim().toUpperCase();
    const capacity = Number(form.seating_capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return setErr('Seating capacity must be a whole number from 1 to 100.');
    if (vehicles.some((vehicle) => normalizedKey(vehicle.vehicle_number) === normalizedKey(vehicleNumber) || normalizedKey(vehicle.registration_number) === normalizedKey(registrationNumber))) {
      return setErr('That vehicle number or registration is already in use.');
    }
    try {
      await fleetApi.createVehicle({ ...form, vehicle_number: vehicleNumber, registration_number: registrationNumber, bus_name: normalizeText(form.bus_name || '') || vehicleNumber, seating_capacity: capacity });
      setModal(false); setForm({ vehicle_number: '', registration_number: '', bus_name: '', vehicle_type: 'AC Coach', seating_capacity: 36 }); refresh(); refreshLookups();
    } catch (error) {
      setErr(error.response?.data?.message || error.message);
    }
  }
  async function cycleStatus(v) {
    const next = CYCLE[(CYCLE.indexOf(v.status) + 1) % CYCLE.length];
    await fleetApi.changeVehicleStatus(v.id, next, 'Manual status change');
    refresh(); refreshLookups();
  }

  return (
    <>
      <div className="ph">
        <div><h2>Fleet Management</h2><p>Vehicle master records</p></div>
        <button className="btn" onClick={() => { setForm({ vehicle_number: '', registration_number: '', bus_name: '', vehicle_type: 'AC Coach', seating_capacity: 36 }); setErr(''); setModal(true); }}>+ Add Vehicle</button>
      </div>
      <div className="card"><div className="bd">
        <table><tbody>
          <tr><th>Bus No.</th><th>Registration</th><th>Type</th><th>Capacity</th><th>Status</th><th></th></tr>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td><b>{v.vehicle_number}</b> · {v.bus_name}</td>
              <td>{v.registration_number}</td>
              <td>{v.vehicle_type}</td>
              <td>{v.seating_capacity} seats</td>
              <td><StatusBadge status={v.status} /></td>
              <td><button className="btn sm gh" onClick={() => cycleStatus(v)}>Change Status</button></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>

      {modal && (
        <Modal title="Add Vehicle" onClose={() => setModal(false)} onConfirm={save}>
          <div className="grid2">
            <div className="fld"><label>Vehicle Number</label><input autoFocus required maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9-]{0,19}" title="Use letters, numbers, and hyphens." placeholder="BUS-45" value={form.vehicle_number || ''} onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))} /></div>
            <div className="fld"><label>Registration No.</label><input required minLength={3} maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9 -]{2,19}" title="Use letters, numbers, spaces, and hyphens." placeholder="LEA-1201" value={form.registration_number || ''} onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))} /></div>
            <div className="fld"><label>Bus Name</label><input maxLength={60} pattern="[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*" title="Use letters, numbers, spaces, apostrophes, and hyphens." placeholder="Iqbal Deluxe (optional)" value={form.bus_name || ''} onChange={(e) => setForm((f) => ({ ...f, bus_name: e.target.value }))} /></div>
            <div className="fld"><label>Vehicle Type</label>
              <select required value={form.vehicle_type || ''} onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}>
                <option>AC Coach</option><option>Non-AC</option>
              </select>
            </div>
            <div className="fld"><label>Seating Capacity</label><input required type="number" min="1" max="100" step="1" value={form.seating_capacity} onChange={(e) => setForm((f) => ({ ...f, seating_capacity: e.target.value }))} /></div>
          </div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
