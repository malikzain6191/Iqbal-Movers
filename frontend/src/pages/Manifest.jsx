import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as scheduleApi from '../api/scheduleApi';
import * as bookingApi from '../api/bookingApi';
import { routeName, vehName, drvName, fmtDT } from '../utils/lookups';
import DataGrid from '../components/DataGrid';

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
  const currentRoute = routes.find((route) => String(route.id) === String(currentSchedule?.route_id));

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
            <div className="grid3" style={{ margin: '14px 0', fontSize: 13 }}>
              <div><b>Route</b><br />{routeName(currentSchedule?.route_id, routes)}</div>
              <div><b>Vehicle</b><br />{vehName(currentSchedule?.vehicle_id, vehicles)}</div>
              <div><b>Driver</b><br />{currentSchedule?.driver_name || drvName(currentSchedule?.driver_id, drivers)}</div>
              <div><b>Departure</b><br />{currentSchedule?.departure_datetime ? fmtDT(currentSchedule.departure_datetime) : '-'}</div>
              <div><b>Arrival</b><br />{currentSchedule?.arrival_datetime ? fmtDT(currentSchedule.arrival_datetime) : '-'}</div>
              <div><b>Distance to travel</b><br />{Number(currentRoute?.distance_km) > 0 ? `${Number(currentRoute.distance_km).toLocaleString()} km` : '-'}</div>
              <div><b>Estimated travel time</b><br />{Number(currentRoute?.estimated_duration_minutes) > 0 ? `${Number(currentRoute.estimated_duration_minutes).toLocaleString()} min` : '-'}</div>
            </div>
            <DataGrid data={manifest.passengers} columns={[
              { accessorKey: 'seat_number', header: 'Seat' },
              { accessorKey: 'name', header: 'Passenger' },
              { id: 'gender', header: 'Gender', accessorFn: (passenger) => ({ M: 'Male', F: 'Female', Other: 'Other' }[passenger.gender] || '-') },
              { accessorKey: 'cnic', header: 'CNIC' },
              { accessorKey: 'mobile_number', header: 'Mobile' }
            ]} emptyMessage="No passengers booked yet." />
          </>
        )}
      </div></div>
    </>
  );
}
