import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as reportApi from '../api/reportApi';
import { fmtDT, money, vehicleLabel, scheduleVehicleName, drvName } from '../utils/lookups';
import DataGrid from '../components/DataGrid';

const TABS = [
  ['daily', 'Daily Sales'],
  ['route', 'Route Revenue'],
  ['vehicle', 'Vehicle Utilization'],
  ['driver', 'Driver Performance'],
  ['cash', 'Cash Collection'],
  ['trips', 'Trip History']
];

export default function Reports() {
  const { user } = useAuth();
  const { drivers, vehicles } = useLookups();
  const [tab, setTab] = useState('daily');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [tripDateScope, setTripDateScope] = useState('today');
  const [tripDriverId, setTripDriverId] = useState('');
  const [tripVehicleId, setTripVehicleId] = useState('');
  const visibleTabs = TABS.filter(([id]) => {
    if (id === 'trips') return user.role === 'super_admin';
    if (user.role === 'counter_operator') return ['daily', 'cash'].includes(id);
    return true;
  });

  useEffect(() => {
    setError('');
    const request = tab === 'trips'
      ? reportApi.getTripHistory({ date_scope: tripDateScope, driver_id: tripDriverId, vehicle_id: tripVehicleId })
      : ({
          daily: () => reportApi.getDailySales(),
          route: () => reportApi.getRouteRevenue(),
          vehicle: () => reportApi.getVehicleUtilization(),
          driver: () => reportApi.getDriverPerformance(),
          cash: () => reportApi.getCashCollection()
        }[tab])();
    request.then((r) => setRows(r.data)).catch((err) => {
      setRows([]);
      setError(err.response?.data?.message || err.message);
    });
  }, [tab, user, tripDateScope, tripDriverId, tripVehicleId]);

  function renderTable() {
    if (tab === 'daily') return <DataGrid data={rows} columns={[
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'tickets', header: 'Tickets Sold', accessorFn: (row) => Number(row.tickets) },
      { id: 'revenue', header: 'Revenue', accessorFn: (row) => Number(row.revenue), cell: ({ row }) => money(row.original.revenue) }
    ]} />;
    if (tab === 'route') return <DataGrid data={rows} columns={[
      { accessorKey: 'route', header: 'Route' },
      { accessorKey: 'passengers', header: 'Passengers', accessorFn: (row) => Number(row.passengers) },
      { id: 'revenue', header: 'Revenue', accessorFn: (row) => Number(row.revenue), cell: ({ row }) => money(row.original.revenue) },
      { id: 'occupancy', header: 'Occupancy', accessorFn: (row) => Number(row.occupancy_pct), cell: ({ row }) => `${row.original.occupancy_pct}%` }
    ]} />;
    if (tab === 'vehicle') return <DataGrid data={rows} columns={[
      { accessorKey: 'vehicle', header: 'Vehicle' },
      { accessorKey: 'trips', header: 'Trips', accessorFn: (row) => Number(row.trips) },
      { id: 'revenue', header: 'Revenue', accessorFn: (row) => Number(row.revenue), cell: ({ row }) => money(row.original.revenue) },
      { accessorKey: 'passengers', header: 'Passengers', accessorFn: (row) => Number(row.passengers) }
    ]} />;
    if (tab === 'driver') return <DataGrid data={rows} columns={[
      { accessorKey: 'driver', header: 'Driver' },
      { accessorKey: 'trips', header: 'Trips', accessorFn: (row) => Number(row.trips) },
      { id: 'revenue', header: 'Revenue', accessorFn: (row) => Number(row.revenue), cell: ({ row }) => money(row.original.revenue) },
      { accessorKey: 'passengers', header: 'Passengers', accessorFn: (row) => Number(row.passengers) }
    ]} />;
    if (tab === 'trips') return <DataGrid data={rows} columns={[
      { accessorKey: 'schedule_number', header: 'Schedule' },
      { accessorKey: 'departure_datetime', header: 'Departure', cell: ({ row }) => fmtDT(row.original.departure_datetime) },
      { id: 'route', header: 'Route', accessorKey: 'route_name' },
      { id: 'from', header: 'From', accessorFn: (row) => `${row.departure_city_name} · ${row.departure_terminal_name}` },
      { id: 'to', header: 'To', accessorFn: (row) => `${row.arrival_city_name} · ${row.arrival_terminal_name}` },
      { id: 'arrival', header: 'Arrival', accessorFn: (row) => row.arrival_datetime, cell: ({ row }) => fmtDT(row.original.arrival_datetime) },
      { id: 'vehicle', header: 'Bus', accessorFn: (trip) => scheduleVehicleName(trip, vehicles) },
      { id: 'driver', header: 'Driver', accessorFn: (trip) => trip.driver_name || drvName(trip.driver_id, drivers) },
      { id: 'distance', header: 'Distance to travel', accessorFn: (row) => Number(row.distance_km || 0), cell: ({ row }) => row.original.distance_km ? `${Number(row.original.distance_km).toLocaleString()} km` : '-' },
      { id: 'duration', header: 'Estimated travel time', accessorFn: (row) => Number(row.estimated_duration_minutes || 0), cell: ({ row }) => row.original.estimated_duration_minutes ? `${Number(row.original.estimated_duration_minutes).toLocaleString()} min` : '-' },
      { accessorKey: 'trip_state', header: 'Trip status' }
    ]} />;
    return <DataGrid data={rows} columns={[
      { accessorKey: 'counter', header: 'Counter Operator' },
      { accessorKey: 'tickets', header: 'Tickets Sold', accessorFn: (row) => Number(row.tickets) },
      { id: 'cash', header: 'Cash Collected', accessorFn: (row) => Number(row.cash), cell: ({ row }) => money(row.original.cash) }
    ]} />;
  }

  return (
    <>
      <div className="ph"><div><h2>Reports & Cash Collection</h2><p>Business intelligence</p></div></div>
      <div className="tabs">
        {visibleTabs.map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>
      {tab === 'trips' && (
        <div className="grid3" style={{ marginBottom: 14 }}>
          <div className="fld"><label>Period</label><select value={tripDateScope} onChange={(event) => setTripDateScope(event.target.value)}><option value="today">Today</option><option value="all">All trips</option></select></div>
          <div className="fld"><label>Driver</label><select value={tripDriverId} onChange={(event) => setTripDriverId(event.target.value)}><option value="">All drivers</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></div>
          <div className="fld"><label>Vehicle</label><select value={tripVehicleId} onChange={(event) => setTripVehicleId(event.target.value)}><option value="">All vehicles</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}</select></div>
        </div>
      )}
      <div className="card"><div className="bd">{error ? <div className="err" style={{ display: 'block' }}>{error}</div> : renderTable()}</div></div>
    </>
  );
}
