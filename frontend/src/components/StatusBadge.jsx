const MAP = {
  Active: 'ok', Open: 'ok', Booked: 'ok', Available: 'ok',
  'Under Maintenance': 'warn', Reserved: 'warn',
  Inactive: 'danger', Suspended: 'danger', Cancelled: 'danger', Refunded: 'danger', Booked_seat: 'mut'
};

export default function StatusBadge({ status }) {
  const cls = MAP[status] || 'mut';
  return <span className={`badge b-${cls}`}>{status}</span>;
}
