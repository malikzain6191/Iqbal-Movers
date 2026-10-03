const byId = (rows, id) => rows.find((row) => String(row.id) === String(id));

export const cityName = (id, cities = []) => byId(cities, id)?.name || '-';
export const termName = (id, terminals = []) => byId(terminals, id)?.name || '-';
export const vehicleLabel = (vehicle) => {
  if (!vehicle) return '-';
  return [vehicle.vehicle_number, vehicle.registration_number]
    .filter(Boolean)
    .join(' · ') || '-';
};
export const vehName = (id, vehicles = []) => vehicleLabel(byId(vehicles, id));
export const scheduleVehicleName = (schedule, vehicles = []) => {
  const joinedVehicle = schedule && (schedule.bus_name || schedule.vehicle_number || schedule.registration_number);
  return joinedVehicle ? vehicleLabel(schedule) : vehName(schedule?.vehicle_id, vehicles);
};
export const drvName = (id, drivers = []) => byId(drivers, id)?.name || '-';
export const routeName = (id, routes = []) => byId(routes, id)?.name || '-';

export const money = (n) => 'Rs ' + Number(n || 0).toLocaleString();
export function fmtDT(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export const today = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};
