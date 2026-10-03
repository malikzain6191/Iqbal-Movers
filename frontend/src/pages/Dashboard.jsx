import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as reportApi from '../api/reportApi';
import { routeName, scheduleVehicleName, drvName, money, fmtDT } from '../utils/lookups';
import DataGrid from '../components/DataGrid';

export default function Dashboard() {
  const { user } = useAuth();
  const { routes, vehicles, drivers } = useLookups();
  const [d, setD] = useState(null);
  const [directionFilter, setDirectionFilter] = useState('all');

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
        <div className="hd"><h3>Upcoming arrivals and departures</h3></div>
        <div className="bd">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <select aria-label="Filter upcoming events by direction" value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)} style={{ width: 190 }}>
              <option value="all">All events</option>
              <option value="Departure">Departures</option>
              <option value="Arrival">Arrivals</option>
            </select>
          </div>
          <DataGrid data={d.upcoming.filter((event) => directionFilter === 'all' || event.direction === directionFilter)} columns={[
            { accessorKey: 'direction', header: 'Type' },
            { id: 'route', header: 'Route', accessorFn: (schedule) => schedule.route_name || routeName(schedule.route_id, routes) },
            { accessorKey: 'event_datetime', header: 'Time', cell: ({ row }) => fmtDT(row.original.event_datetime) },
            { id: 'from', header: 'From', accessorFn: (schedule) => `${schedule.departure_city_name} · ${schedule.departure_terminal_name}` },
            { id: 'to', header: 'To', accessorFn: (schedule) => `${schedule.arrival_city_name} · ${schedule.arrival_terminal_name}` },
            { id: 'vehicle', header: 'Vehicle', accessorFn: (schedule) => scheduleVehicleName(schedule, vehicles) },
            { id: 'driver', header: 'Driver', accessorFn: (schedule) => schedule.driver_name || drvName(schedule.driver_id, drivers) },
            { accessorKey: 'fare', header: 'Fare', accessorFn: (schedule) => Number(schedule.fare), cell: ({ row }) => money(row.original.fare) }
          ]} emptyMessage="No upcoming arrivals or departures in scope." />
        </div>
      </div>
    </>
  );
}
