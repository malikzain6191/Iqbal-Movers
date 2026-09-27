import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as reportApi from '../api/reportApi';
import { routeName, vehName, drvName, money, fmtDT } from '../utils/lookups';

export default function Dashboard() {
  const { user } = useAuth();
  const { routes, vehicles, drivers } = useLookups();
  const [d, setD] = useState(null);

  useEffect(() => {
    reportApi.getTodayDashboard().then((res) => setD(res.data));
  }, [user]);

  if (!d) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="ph">
        <div>
          <h2>Dashboard</h2>
          <p>Today's operations overview</p>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><b>{d.trips_today}</b><span>Trips today</span></div>
        <div className="kpi"><b>{money(d.revenue_today)}</b><span>Revenue today</span></div>
        <div className="kpi"><b>{d.tickets_today}</b><span>Tickets sold today</span></div>
        <div className="kpi"><b>{d.active_routes}</b><span>Active routes</span></div>
      </div>
      <div className="card">
        <div className="hd"><h3>Upcoming departures</h3></div>
        <div className="bd">
          {d.upcoming.length ? (
            <table>
              <tbody>
                <tr><th>Route</th><th>Departure</th><th>Vehicle</th><th>Driver</th><th>Fare</th></tr>
                {d.upcoming.map((s) => (
                  <tr key={s.id}>
                    <td>{s.route_name || routeName(s.route_id, routes)}</td>
                    <td>{fmtDT(s.departure_datetime)}</td>
                    <td>{s.vehicle_number || vehName(s.vehicle_id, vehicles)}</td>
                    <td>{s.driver_name || drvName(s.driver_id, drivers)}</td>
                    <td>{money(s.fare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No upcoming departures in scope.</div>
          )}
        </div>
      </div>
    </>
  );
}
