import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as reportApi from '../api/reportApi';
import { money } from '../utils/lookups';

const TABS = [
  ['daily', 'Daily Sales'],
  ['route', 'Route Revenue'],
  ['vehicle', 'Vehicle Utilization'],
  ['driver', 'Driver Performance'],
  ['cash', 'Cash Collection']
];

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState('daily');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const visibleTabs = user.role === 'counter_operator'
    ? TABS.filter(([id]) => ['daily', 'cash'].includes(id))
    : TABS;

  useEffect(() => {
    setError('');
    const fn = {
      daily: () => reportApi.getDailySales(),
      route: () => reportApi.getRouteRevenue(),
      vehicle: () => reportApi.getVehicleUtilization(),
      driver: () => reportApi.getDriverPerformance(),
      cash: () => reportApi.getCashCollection()
    }[tab];
    fn().then((r) => setRows(r.data)).catch((err) => {
      setRows([]);
      setError(err.response?.data?.message || err.message);
    });
  }, [tab, user]);

  function renderTable() {
    if (!rows.length) return <div className="empty">No data</div>;
    if (tab === 'daily') return (
      <table><tbody>
        <tr><th>Date</th><th>Tickets Sold</th><th>Revenue</th></tr>
        {rows.map((r) => <tr key={r.date}><td>{r.date}</td><td>{r.tickets}</td><td>{money(r.revenue)}</td></tr>)}
      </tbody></table>
    );
    if (tab === 'route') return (
      <table><tbody>
        <tr><th>Route</th><th>Passengers</th><th>Revenue</th><th>Occupancy</th></tr>
        {rows.map((r) => <tr key={r.route}><td>{r.route}</td><td>{r.passengers}</td><td>{money(r.revenue)}</td><td>{r.occupancy_pct}%</td></tr>)}
      </tbody></table>
    );
    if (tab === 'vehicle') return (
      <table><tbody>
        <tr><th>Vehicle</th><th>Trips</th><th>Revenue</th><th>Passengers</th></tr>
        {rows.map((r) => <tr key={r.vehicle}><td>{r.vehicle}</td><td>{r.trips}</td><td>{money(r.revenue)}</td><td>{r.passengers}</td></tr>)}
      </tbody></table>
    );
    if (tab === 'driver') return (
      <table><tbody>
        <tr><th>Driver</th><th>Trips</th><th>Revenue</th><th>Passengers</th></tr>
        {rows.map((r) => <tr key={r.driver}><td>{r.driver}</td><td>{r.trips}</td><td>{money(r.revenue)}</td><td>{r.passengers}</td></tr>)}
      </tbody></table>
    );
    return (
      <table><tbody>
        <tr><th>Counter Operator</th><th>Tickets Sold</th><th>Cash Collected</th></tr>
        {rows.map((r) => <tr key={r.counter}><td>{r.counter}</td><td>{r.tickets}</td><td>{money(r.cash)}</td></tr>)}
      </tbody></table>
    );
  }

  return (
    <>
      <div className="ph"><div><h2>Reports & Cash Collection</h2><p>Business intelligence</p></div></div>
      <div className="tabs">
        {visibleTabs.map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>
      <div className="card"><div className="bd">{error ? <div className="err" style={{ display: 'block' }}>{error}</div> : renderTable()}</div></div>
    </>
  );
}
