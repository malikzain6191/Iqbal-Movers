import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as scheduleApi from '../api/scheduleApi';
import { routeName, vehName, drvName, money, fmtDT, today } from '../utils/lookups';
import Modal from '../components/Modal';

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
    const arrival = new Date(departure.getTime() + 2 * 60 * 60 * 1000);
    const localDateTime = (value) => {
      const pad = (part) => String(part).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
    };
    return { departure: localDateTime(departure), arrival: localDateTime(arrival) };
  }

  useEffect(() => {
    if (!modal) return;
    const { departure, arrival } = getScheduleTimes(form.date, form.time);
    scheduleApi.getAvailability(departure, arrival, null).then((r) => setAvail(r.data)).catch((error) => setErr(error.response?.data?.message || error.message));
  }, [modal, form.date, form.time]);

  async function createSchedule() {
    setErr('');
    if (!form.route_id || !form.vehicle_id || !form.driver_id) return setErr('Select route, vehicle and driver.');
    const { departure, arrival } = getScheduleTimes(form.date, form.time);
    if (new Date(departure) <= new Date()) return setErr('Departure must be in the future.');
    try {
      await scheduleApi.createSchedule({ route_id: form.route_id, vehicle_id: form.vehicle_id, driver_id: form.driver_id, departure_datetime: departure, arrival_datetime: arrival, fare: +form.fare });
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
        <table><tbody>
          <tr><th>Route</th><th>Departure</th><th>Vehicle</th><th>Driver</th><th>Fare</th><th>Seats</th><th>Status</th><th></th></tr>
          {schedules.map((s) => {
            const seats = seatsBySchedule[String(s.id)] || [];
            const booked = seats.filter((x) => x.status === 'Booked').length;
            return (
              <tr key={s.id}>
                <td><b>{routeName(s.route_id, routes)}</b></td>
                <td>{fmtDT(s.departure_datetime)}</td>
                <td>{vehName(s.vehicle_id, vehicles)}</td>
                <td>{drvName(s.driver_id, drivers)}</td>
                <td>{money(s.fare)}</td>
                <td>{booked}/{seats.length}</td>
                <td><span className={`badge ${s.status === 'Open' ? 'b-ok' : s.status === 'Cancelled' ? 'b-danger' : 'b-mut'}`}>{s.status}</span></td>
                <td>
                  {s.status === 'Open' && (
                    <>
                      <button className="btn sm gh" onClick={() => setReplaceFor(s)}>Replace Vehicle</button>{' '}
                      <button className="btn sm danger" onClick={() => cancelSchedule(s)}>Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody></table>
      </div></div>

      {modal && (
        <Modal title="Create Schedule" onClose={() => setModal(false)} onConfirm={createSchedule} confirmLabel="Create Schedule">
          <div className="fld"><label>Route</label>
            <select required value={form.route_id} onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value }))}>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid2">
            <div className="fld"><label>Departure Date</label><input required type="date" min={today(0)} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
            <div className="fld"><label>Departure Time</label><input required type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></div>
          </div>
          <div className="fld"><label>Fare (PKR)</label><input required type="number" min="0.01" step="0.01" value={form.fare} onChange={(e) => setForm((f) => ({ ...f, fare: e.target.value }))} /></div>

          {avail && (
            <>
              <label>Available Vehicles</label>
              {avail.vehicles.map((v) => (
                <div key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                  <input required type="radio" name="veh" disabled={!v.available} checked={String(form.vehicle_id) === String(v.id)} onChange={() => setForm((f) => ({ ...f, vehicle_id: v.id }))} />
                  {v.vehicle_number} ({v.seating_capacity} seats)
                  <span className={`badge ${v.available ? 'b-ok' : 'b-danger'}`}>{v.available ? 'Available' : v.reason}</span>
                </div>
              ))}
              <label style={{ marginTop: 10 }}>Available Drivers</label>
              {avail.drivers.map((d) => (
                <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                  <input required type="radio" name="drv" disabled={!d.available} checked={String(form.driver_id) === String(d.id)} onChange={() => setForm((f) => ({ ...f, driver_id: d.id }))} />
                  {d.name}
                  <span className={`badge ${d.available ? 'b-ok' : 'b-danger'}`}>{d.available ? 'Available' : d.reason}</span>
                </div>
              ))}
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
              {v.vehicle_number}
            </button>
          ))}
        </Modal>
      )}
    </>
  );
}
