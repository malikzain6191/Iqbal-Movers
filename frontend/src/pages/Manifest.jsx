import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as scheduleApi from '../api/scheduleApi';
import * as bookingApi from '../api/bookingApi';
import { routeName, vehName, drvName, fmtDT } from '../utils/lookups';

export default function Manifest() {
  const { user } = useAuth();
  const { routes, vehicles, drivers } = useLookups();
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState('');
  const [manifest, setManifest] = useState(null);
  const [seats, setSeats] = useState([]);

  useEffect(() => {
    scheduleApi.listSchedules().then((r) => {
      setSchedules(r.data);
      if (r.data[0]) setScheduleId(r.data[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!scheduleId) return;
    bookingApi.getManifest(scheduleId).then((r) => setManifest(r.data));
    scheduleApi.getScheduleSeats(scheduleId).then((r) => setSeats(r.data));
  }, [scheduleId]);

  const bookedCount = seats.filter((s) => s.status === 'Booked').length;
  const currentSchedule = schedules.find((schedule) => String(schedule.id) === String(scheduleId));

  return (
    <>
      <div className="ph">
        <div><h2>Schedule Manifest</h2><p>Passenger list for driver / conductor / terminal staff</p></div>
        <button className="btn gh no-print" onClick={() => window.print()}>🖨 Print</button>
      </div>
      <div className="card"><div className="bd">
        <select className="no-print" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          {schedules.map((s) => <option key={s.id} value={s.id}>{routeName(s.route_id, routes)} · {fmtDT(s.departure_datetime)}</option>)}
        </select>
        {manifest && (
          <>
            <div className="grid3" style={{ marginTop: 14 }}>
              <div className="kpi"><b>{seats.length}</b><span>Total seats</span></div>
              <div className="kpi"><b>{bookedCount}</b><span>Booked seats</span></div>
              <div className="kpi"><b>{seats.length - bookedCount}</b><span>Available seats</span></div>
            </div>
            <p style={{ margin: '12px 0', fontSize: 13, color: 'var(--slate)' }}>
              Bus: <b>{vehName(currentSchedule?.vehicle_id, vehicles)}</b> · Driver: <b>{drvName(currentSchedule?.driver_id, drivers)}</b> · Route: <b>{routeName(currentSchedule?.route_id, routes)}</b>
            </p>
            <table><tbody>
              <tr><th>Seat</th><th>Passenger</th><th>CNIC</th><th>Mobile</th></tr>
              {manifest.passengers.length ? [...manifest.passengers].sort((a, b) => a.seat_number.localeCompare(b.seat_number)).map((p) => (
                <tr key={`${p.seat_number}-${p.name}`}><td>{p.seat_number}</td><td>{p.name}</td><td>{p.cnic}</td><td>{p.mobile_number}</td></tr>
              )) : <tr><td colSpan={4} className="empty">No passengers booked yet.</td></tr>}
            </tbody></table>
          </>
        )}
      </div></div>
    </>
  );
}
