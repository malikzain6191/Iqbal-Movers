import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as scheduleApi from '../api/scheduleApi';
import { routeName, vehName, vehicleLabel, scheduleVehicleName, drvName, money, fmtDT, today } from '../utils/lookups';
import Modal from '../components/Modal';
import DataGrid from '../components/DataGrid';

export default function Schedules() {
  const { user } = useAuth();
  const { routes, vehicles, drivers } = useLookups();
  const [schedules, setSchedules] = useState([]);
  const [seatsBySchedule, setSeatsBySchedule] = useState({});
  const [modal, setModal] = useState(false);
  const [replaceFor, setReplaceFor] = useState(null);
  const [form, setForm] = useState({ route_id: '', date: today(0), time: '16:00', fare: 1500, vehicle_id: '', driver_id: '' });
  const [avail, setAvail] = useState(null);
  const [err, setErr] = useState('');
  const availableVehicles = avail?.vehicles.filter((vehicle) => vehicle.available) || [];
  const availableDrivers = avail?.drivers.filter((driver) => driver.available) || [];

  function refresh() {
    scheduleApi.listSchedules().then(async (r) => {
      setSchedules(r.data);
      const seatRows = await Promise.all(r.data.map((schedule) => scheduleApi.getScheduleSeats(schedule.id)));
      setSeatsBySchedule(Object.fromEntries(r.data.map((schedule, index) => [String(schedule.id), seatRows[index].data])));
    });
  }
  useEffect(refresh, [user]);

  function getScheduleTimes(date, time) {
    const departure = new Date(`${date}T${time}:00`);
    const localDateTime = (value) => {
      const pad = (part) => String(part).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
    };
    return { departure: localDateTime(departure) };
  }

  useEffect(() => {
    if (!modal || !form.route_id) {
      setAvail(null);
      return;
    }
    setErr('');
    const { departure } = getScheduleTimes(form.date, form.time);
    scheduleApi.getAvailability(form.route_id, departure, null)
      .then((r) => { setAvail(r.data); setErr(''); })
      .catch((error) => { setAvail(null); setErr(error.response?.data?.message || error.message); });
  }, [modal, form.route_id, form.date, form.time]);

  async function createSchedule() {
    setErr('');
    if (!form.route_id || !form.vehicle_id || !form.driver_id) return setErr('Select route, vehicle and driver.');
    const { departure } = getScheduleTimes(form.date, form.time);
    if (new Date(departure) <= new Date()) return setErr('Departure must be in the future.');
    try {
      await scheduleApi.createSchedule({ route_id: form.route_id, vehicle_id: form.vehicle_id, driver_id: form.driver_id, departure_datetime: departure, fare: +form.fare });
      setModal(false); refresh();
    } catch (e) { setErr(e.message); }
  }

  async function cancelSchedule(s) {
    if (!confirm('Cancel this schedule? All bookings will be cancelled and refunded.')) return;
    const { data } = await scheduleApi.cancelSchedule(s.id);
    alert(`Schedule cancelled. ${data.bookings_refunded} booking(s) refunded (Rs ${data.total_refunded}).`);
    refresh();
  }

  async function doReplace(newVehicleId) {
    await scheduleApi.replaceVehicle(replaceFor.id, newVehicleId, 'Emergency replacement');
    setReplaceFor(null); refresh();
  }

  return (
    <>
      <div className="ph">
        <div><h2>Schedules & Availability Planner</h2><p>Trips, vehicle & driver assignment</p></div>
        <button className="btn" onClick={() => { setForm({ route_id: '', date: today(0), time: '16:00', fare: 1500, vehicle_id: '', driver_id: '' }); setAvail(null); setErr(''); setModal(true); }}>+ Create Schedule</button>
      </div>
      <div className="card"><div className="bd">
        <DataGrid data={schedules.map((schedule) => {
          const seats = seatsBySchedule[String(schedule.id)] || [];
          return { ...schedule, bookedSeats: seats.filter((seat) => seat.status === 'Booked').length, seatCount: seats.length };
        })} columns={[
          { id: 'route', header: 'Route', accessorFn: (schedule) => routeName(schedule.route_id, routes), cell: ({ row }) => <b>{routeName(row.original.route_id, routes)}</b> },
          { accessorKey: 'departure_datetime', header: 'Departure', cell: ({ row }) => fmtDT(row.original.departure_datetime) },
          { id: 'vehicle', header: 'Vehicle', accessorFn: (schedule) => scheduleVehicleName(schedule, vehicles) },
          { id: 'driver', header: 'Driver', accessorFn: (schedule) => schedule.driver_name || drvName(schedule.driver_id, drivers) },
          { accessorKey: 'fare', header: 'Fare', accessorFn: (schedule) => Number(schedule.fare), cell: ({ row }) => money(row.original.fare) },
          { id: 'seats', header: 'Seats', accessorFn: (schedule) => `${schedule.bookedSeats}/${schedule.seatCount}` },
          { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={`badge ${row.original.status === 'Open' ? 'b-ok' : row.original.status === 'Cancelled' ? 'b-danger' : 'b-mut'}`}>{row.original.status}</span> },
          { id: 'actions', header: '', enableSorting: false, enableColumnFilter: false, cell: ({ row }) => row.original.status === 'Open' ? <><button className="btn sm gh" onClick={() => setReplaceFor(row.original)}>Replace Vehicle</button>{' '}<button className="btn sm danger" onClick={() => cancelSchedule(row.original)}>Cancel</button></> : null }
        ]} />
      </div></div>

      {modal && (
        <Modal title="Create Schedule" onClose={() => setModal(false)} onConfirm={createSchedule} confirmLabel="Create Schedule">
          <div className="fld"><label>Route</label>
              <select required value={form.route_id} onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value, vehicle_id: '', driver_id: '' }))}>
              <option value="">Select route</option>
                {routes.map((r) => <option key={r.id} value={r.id} disabled={!Number(r.distance_km) || !Number(r.estimated_duration_minutes)}>{r.name}{!Number(r.distance_km) || !Number(r.estimated_duration_minutes) ? ' · needs distance and duration' : ''}</option>)}
            </select>
          </div>
          <div className="grid2">
            <div className="fld"><label>Departure Date</label><input required type="date" min={today(0)} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
            <div className="fld"><label>Departure Time</label><input required type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
          </div>
          <div className="fld"><label>Fare (PKR)</label><input required type="number" min="0.01" step="0.01" value={form.fare} onChange={(e) => setForm((f) => ({ ...f, fare: e.target.value }))} /></div>

          {avail && (
            <>
              <div style={{ margin: '8px 0 12px', fontSize: 13 }}>
                <b>Route:</b> {avail.route.name} · {avail.route.distance_km} km · {avail.route.estimated_duration_minutes} min · <b>Arrival:</b> {fmtDT(avail.arrival_datetime)}
              </div>
              <div className="grid2">
                <div className="fld">
                  <label>Available buses at {avail.route.origin_terminal_name || 'departure terminal'}</label>
                  <select required value={form.vehicle_id} onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))}>
                    <option value="">Select an available bus</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicleLabel(vehicle)} · {vehicle.seating_capacity} seats · at {vehicle.current_terminal_name || 'terminal'}
                      </option>
                    ))}
                  </select>
                  {!availableVehicles.length && <div className="empty">No buses can make this trip at the selected time.</div>}
                </div>
                <div className="fld">
                  <label>Available drivers at {avail.route.origin_terminal_name || 'departure terminal'}</label>
                  <select required value={form.driver_id} onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))}>
                    <option value="">Select an available driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} · at {driver.current_terminal_name || 'terminal'}
                      </option>
                    ))}
                  </select>
                  {!availableDrivers.length && <div className="empty">No drivers can make this trip at the selected time.</div>}
                </div>
              </div>
              {(availableVehicles.some((vehicle) => vehicle.next_assignment) || availableDrivers.some((driver) => driver.next_assignment)) && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--slate)' }}>
                  Next assignments and reposition time are shown in each resource's itinerary.
                </div>
              )}
            </>
          )}
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}

      {replaceFor && (
        <Modal title="Replace Vehicle" onClose={() => setReplaceFor(null)} hideFooter>
          <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 10 }}>
            Current: <b>{vehName(replaceFor.vehicle_id, vehicles)}</b>. Existing tickets remain valid.
          </p>
            {vehicles.filter((v) => String(v.id) !== String(replaceFor.vehicle_id) && v.status === 'Active').map((v) => (
            <button key={v.id} className="btn gh" style={{ display: 'block', width: '100%', marginBottom: 6 }} onClick={() => doReplace(v.id)}>
              {vehicleLabel(v)}
            </button>
          ))}
        </Modal>
      )}
    </>
  );
}
