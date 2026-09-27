import { useEffect, useState } from 'react';
import * as auditApi from '../api/auditApi';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { auditApi.listAuditLogs().then((r) => setLogs(r.data)); }, []);

  return (
    <>
      <div className="ph"><div><h2>Audit Log</h2><p>Complete activity trail — every transaction is logged</p></div></div>
      <div className="card"><div className="bd">
        <table><tbody>
          <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr>
          {logs.length ? logs.map((a) => (
            <tr key={a.id}><td>{a.created_at}</td><td>{a.user_name}</td><td>{a.action_type}</td><td>{a.entity_name}</td><td>{a.detail}</td></tr>
          )) : <tr><td colSpan={5} className="empty">No activity yet.</td></tr>}
        </tbody></table>
      </div></div>
    </>
  );
}
