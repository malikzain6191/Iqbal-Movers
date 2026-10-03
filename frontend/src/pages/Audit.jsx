import { useEffect, useState } from 'react';
import * as auditApi from '../api/auditApi';
import DataGrid from '../components/DataGrid';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { auditApi.listAuditLogs().then((r) => setLogs(r.data)); }, []);

  return (
    <>
      <div className="ph"><div><h2>Audit Log</h2><p>Complete activity trail — every transaction is logged</p></div></div>
      <div className="card"><div className="bd">
        <DataGrid data={logs} columns={[
          { accessorKey: 'created_at', header: 'Time' },
          { accessorKey: 'user_name', header: 'User' },
          { accessorKey: 'action_type', header: 'Action' },
          { accessorKey: 'entity_name', header: 'Entity' },
          { accessorKey: 'detail', header: 'Detail' }
        ]} emptyMessage="No activity yet." />
      </div></div>
    </>
  );
}
