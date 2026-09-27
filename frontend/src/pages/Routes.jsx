import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLookups } from '../context/LookupsContext';
import * as routeApi from '../api/routeApi';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function RoutesPage() {
  const { user } = useAuth();
  const { terminals, refreshLookups } = useLookups();
  const [routes, setRoutes] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');

  function refresh() { routeApi.listRoutes(user).then((r) => setRoutes(r.data)); }
  useEffect(refresh, [user]);

  async function save() {
    setErr('');
    const originId = form.origin_terminal_id || terminals[0]?.id;
    const destinationId = form.destination_terminal_id || terminals.find((terminal) => String(terminal.id) !== String(terminals[0]?.id))?.id;
    if (!originId || !destinationId) return setErr('Add at least two terminals before creating a route.');
    if (String(originId) === String(destinationId)) return setErr('Origin and destination must be different.');
    if (routes.some((route) => String(route.origin_terminal_id) === String(originId) && String(route.destination_terminal_id) === String(destinationId))) {
      return setErr('This route already exists.');
    }
    if (form.distance_km && (!Number.isFinite(Number(form.distance_km)) || Number(form.distance_km) <= 0)) return setErr('Distance must be greater than zero.');
    if (form.estimated_duration_minutes && (!Number.isInteger(Number(form.estimated_duration_minutes)) || Number(form.estimated_duration_minutes) <= 0)) return setErr('Travel time must be a positive whole number.');
    try {
      await routeApi.createRoute({
        origin_terminal_id: originId,
        destination_terminal_id: destinationId,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null
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
        <table><tbody>
          <tr><th>Route</th><th>Distance</th><th>Duration</th><th>Status</th></tr>
          {routes.map((r) => (
            <tr key={r.id}><td><b>{r.name}</b></td><td>{r.distance_km} km</td><td>{r.estimated_duration_minutes} min</td><td><StatusBadge status={r.status} /></td></tr>
          ))}
        </tbody></table>
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
              {terminals.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid2">
            <div className="fld"><label>Distance (km)</label><input type="number" min="0.1" step="0.1" placeholder="130 (optional)" value={form.distance_km || ''} onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))} /></div>
            <div className="fld"><label>Est. Travel Time (min)</label><input type="number" min="1" step="1" placeholder="150 (optional)" value={form.estimated_duration_minutes || ''} onChange={(e) => setForm((f) => ({ ...f, estimated_duration_minutes: e.target.value }))} /></div>
          </div>
          {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
        </Modal>
      )}
    </>
  );
}
