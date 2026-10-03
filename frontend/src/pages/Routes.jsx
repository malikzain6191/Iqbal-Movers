import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as routeApi from '../api/routeApi';
import * as cityApi from '../api/cityApi';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DataGrid from '../components/DataGrid';

export default function RoutesPage() {
  const { user } = useAuth();
  const { terminals, refreshLookups } = useLookups();
  const [routes, setRoutes] = useState([]);
  const [destinationTerminals, setDestinationTerminals] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');

  function refresh() { routeApi.listRoutes(user).then((r) => setRoutes(r.data)); }
  useEffect(refresh, [user]);
  useEffect(() => {
    let active = true;
    cityApi.listRouteDestinations().then((response) => {
      if (active) setDestinationTerminals(response.data);
    });
    return () => { active = false; };
  }, [user]);

  async function save() {
    setErr('');
    if (!Number.isFinite(Number(form.distance_km)) || Number(form.distance_km) <= 0) return setErr('Distance is required and must be greater than zero.');
    if (!Number.isInteger(Number(form.estimated_duration_minutes)) || Number(form.estimated_duration_minutes) <= 0) return setErr('Travel time is required and must be a positive whole number.');
    const originId = form.origin_terminal_id || terminals[0]?.id;
    const destinationId = form.destination_terminal_id || terminals.find((terminal) => String(terminal.id) !== String(terminals[0]?.id))?.id;
    if (!originId || !destinationId) return setErr('Add at least two terminals before creating a route.');
    if (String(originId) === String(destinationId)) return setErr('Origin and destination must be different.');
    if (routes.some((route) => String(route.origin_terminal_id) === String(originId) && String(route.destination_terminal_id) === String(destinationId))) {
      return setErr('This route already exists.');
    }
    try {
      await routeApi.createRoute({
        origin_terminal_id: originId,
        destination_terminal_id: destinationId,
        distance_km: Number(form.distance_km),
        estimated_duration_minutes: Number(form.estimated_duration_minutes)
      });
      setModal(false); setForm({}); refresh(); refreshLookups();
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  }

  return (
    <>
      <div className="ph">
        <div><h2>Route Management</h2><p>Travel paths between terminals</p></div>
        <button className="btn" onClick={() => { setForm({ origin_terminal_id: '', destination_terminal_id: '', distance_km: '', estimated_duration_minutes: '' }); setErr(''); setModal(true); }}>+ Add Route</button>
      </div>
      <div className="card"><div className="bd">
        <DataGrid data={routes} columns={[
          { accessorKey: 'name', header: 'Route', cell: ({ row }) => <b>{row.original.name}</b> },
          { accessorKey: 'distance_km', header: 'Distance', cell: ({ row }) => row.original.distance_km ? `${row.original.distance_km} km` : 'Required' },
          { accessorKey: 'estimated_duration_minutes', header: 'Duration', accessorFn: (route) => Number(route.estimated_duration_minutes || 0), cell: ({ row }) => row.original.estimated_duration_minutes ? `${row.original.estimated_duration_minutes} min` : 'Required' },
          { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
        ]} />
      </div></div>

      {modal && (
        <Modal title="Add Route" onClose={() => setModal(false)} onConfirm={save}>
          <div className="fld"><label>Origin Terminal</label>
            <select required value={form.origin_terminal_id || ''} onChange={(e) => setForm((f) => ({ ...f, origin_terminal_id: e.target.value }))}>
              <option value="">Select origin</option>
              {terminals.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="fld"><label>Destination Terminal</label>
            <select required value={form.destination_terminal_id || ''} onChange={(e) => setForm((f) => ({ ...f, destination_terminal_id: e.target.value }))}>
              <option value="">Select destination</option>
              {destinationTerminals.map((t) => <option key={t.id} value={t.id}>{t.city_name} · {t.name}</option>)}
            </select>
          </div>
          <div className="grid2">
            <div className="fld"><label>Distance (km)</label><input required type="number" min="0.1" step="0.1" placeholder="130" value={form.distance_km || ''} onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))} /></div>
            <div className="fld"><label>Est. Travel Time (min)</label><input required type="number" min="1" step="1" placeholder="150" value={form.estimated_duration_minutes || ''} onChange={(e) => setForm((f) => ({ ...f, estimated_duration_minutes: e.target.value }))} /></div>
          </div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
