import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as fleetApi from '../api/fleetApi';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ResourceItineraryModal from '../components/ResourceItineraryModal';
import DataGrid from '../components/DataGrid';
import { cityName, termName } from '../utils/lookups';
import { normalizeText, normalizedKey } from '../utils/validation';

const CYCLE = ['Active', 'Under Maintenance', 'Inactive'];

export default function Fleet() {
  const { user } = useAuth();
  const { cities, terminals, refreshLookups } = useLookups();
  const [vehicles, setVehicles] = useState([]);
  const [modal, setModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [form, setForm] = useState({ vehicle_type: 'AC Coach', seating_capacity: 36 });
  const [err, setErr] = useState('');
  const cityId = user.role === 'super_admin' ? form.city_id : user.city_id;
  const cityTerminals = terminals.filter((terminal) => String(terminal.city_id) === String(cityId));

  function refresh() { fleetApi.listVehicles().then((r) => setVehicles(r.data)); }
  useEffect(refresh, []);

  async function save() {
    setErr('');
    const vehicleNumber = (form.vehicle_number || '').trim().toUpperCase();
    const registrationNumber = (form.registration_number || '').trim().toUpperCase();
    const capacity = Number(form.seating_capacity);
    if (!cityId) return setErr('Select a city for this vehicle.');
    if (!form.home_terminal_id) return setErr('Select a starting terminal for this vehicle.');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return setErr('Seating capacity must be a whole number from 1 to 100.');
    if (vehicles.some((vehicle) => normalizedKey(vehicle.vehicle_number) === normalizedKey(vehicleNumber) || normalizedKey(vehicle.registration_number) === normalizedKey(registrationNumber))) {
      return setErr('That vehicle number or registration is already in use.');
    }
    try {
      await fleetApi.createVehicle({ ...form, city_id: cityId, vehicle_number: vehicleNumber, registration_number: registrationNumber, bus_name: normalizeText(form.bus_name || '') || vehicleNumber, seating_capacity: capacity });
      setModal(false); setForm({ vehicle_number: '', registration_number: '', bus_name: '', city_id: '', home_terminal_id: '', vehicle_type: 'AC Coach', seating_capacity: 36 }); refresh(); refreshLookups();
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
        <button className="btn" onClick={() => { setForm({ vehicle_number: '', registration_number: '', bus_name: '', city_id: '', home_terminal_id: '', vehicle_type: 'AC Coach', seating_capacity: 36 }); setErr(''); setModal(true); }}>+ Add Vehicle</button>
      </div>
      <div className="card"><div className="bd">
        <DataGrid
          data={vehicles}
          columns={[
            { accessorKey: 'vehicle_number', header: 'Bus No.', cell: ({ row }) => <button className="btn gh" onClick={() => setSelectedVehicle(row.original)}><b>{row.original.vehicle_number}</b> · {row.original.bus_name}</button> },
            { accessorKey: 'registration_number', header: 'Registration' },
            { id: 'city', header: 'City', accessorFn: (vehicle) => cityName(vehicle.city_id, cities) },
            { id: 'home_terminal', header: 'Starting Terminal', accessorFn: (vehicle) => termName(vehicle.home_terminal_id, terminals) },
            { accessorKey: 'vehicle_type', header: 'Type' },
            { id: 'capacity', header: 'Capacity', accessorFn: (vehicle) => Number(vehicle.seating_capacity), cell: ({ row }) => `${row.original.seating_capacity} seats` },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            { id: 'actions', header: '', enableSorting: false, enableColumnFilter: false, cell: ({ row }) => <button className="btn sm gh" onClick={() => cycleStatus(row.original)}>Change Status</button> }
          ]}
        />
      </div></div>

      {modal && (
        <Modal title="Add Vehicle" onClose={() => setModal(false)} onConfirm={save}>
          <div className="grid2">
            <div className="fld"><label>Vehicle Number</label><input autoFocus required maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9-]{0,19}" title="Use letters, numbers, and hyphens." placeholder="BUS-45" value={form.vehicle_number || ''} onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))} /></div>
            <div className="fld"><label>Registration No.</label><input required minLength={3} maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9 -]{2,19}" title="Use letters, numbers, spaces, and hyphens." placeholder="LEA-1201" value={form.registration_number || ''} onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))} /></div>
            <div className="fld"><label>Bus Name</label><input maxLength={60} pattern="[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*" title="Use letters, numbers, spaces, apostrophes, and hyphens." placeholder="Iqbal Deluxe (optional)" value={form.bus_name || ''} onChange={(e) => setForm((f) => ({ ...f, bus_name: e.target.value }))} /></div>
            {user.role === 'super_admin' && (
              <div className="fld"><label>City</label>
                <select required value={form.city_id || ''} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value, home_terminal_id: '' }))}>
                  <option value="">Select a city</option>
                  {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </div>
            )}
            <div className="fld"><label>Starting Terminal</label>
              <select required disabled={!cityId} value={form.home_terminal_id || ''} onChange={(e) => setForm((f) => ({ ...f, home_terminal_id: e.target.value }))}>
                <option value="">Select a starting terminal</option>
                {cityTerminals.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.name}</option>)}
              </select>
            </div>
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
      {selectedVehicle && (
        <ResourceItineraryModal type="vehicle" resource={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </>
  );
}
