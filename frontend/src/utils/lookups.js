const byId = (rows, id) => rows.find((row) => String(row.id) === String(id));

export const cityName = (id, cities = []) => byId(cities, id)?.name || '-';
export const termName = (id, terminals = []) => byId(terminals, id)?.name || '-';
export const vehName = (id, vehicles = []) => byId(vehicles, id)?.vehicle_number || '-';
export const drvName = (id, drivers = []) => byId(drivers, id)?.name || '-';
export const routeName = (id, routes = []) => byId(routes, id)?.name || '-';

export const money = (n) => 'Rs ' + Number(n || 0).toLocaleString();
export function fmtDT(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const today = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};
