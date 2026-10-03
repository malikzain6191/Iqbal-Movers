const db = require('../config/db');
const { scheduleScope } = require('../utils/accessScope');

exports.getallschedules = (user, cb) => {
  const scope = scheduleScope(user, 's');
  db.query(
    `SELECT s.*, r.name AS route_name, v.vehicle_number, v.bus_name, v.registration_number,
            d.name AS driver_name, arrival.name AS arrival_terminal_name
     FROM schedules s
     JOIN routes r ON r.id = s.route_id
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN drivers d ON d.id = s.driver_id
     JOIN terminals arrival ON arrival.id = s.arrival_terminal_id
     WHERE ${scope.sql}`,
    scope.params,
    cb
  );
};

exports.getincomingschedules = (user, cb) => {
  if (user?.role !== 'city_admin' || !user.city_id) return cb(null, []);
  db.query(
    `SELECT s.*, r.name AS route_name, v.vehicle_number, v.bus_name, v.registration_number,
            d.name AS driver_name, departure.name AS departure_terminal_name,
            arrival.name AS arrival_terminal_name
     FROM schedules s
     JOIN routes r ON r.id = s.route_id
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN drivers d ON d.id = s.driver_id
     JOIN terminals departure ON departure.id = s.departure_terminal_id
     JOIN terminals arrival ON arrival.id = s.arrival_terminal_id
     WHERE arrival.city_id = ?
     ORDER BY s.departure_datetime ASC, s.id ASC`,
    [user.city_id],
    cb
  );
};

exports.getschedulebyID = (id, cb) => {
  db.query('SELECT * FROM schedules WHERE id = ?', [id], cb);
};

exports.getschedulebyIDInScope = (id, user, cb) => {
  const scope = scheduleScope(user);
  db.query(
    `SELECT s.* FROM schedules s WHERE s.id = ? AND ${scope.sql}`,
    [id, ...scope.params],
    cb
  );
};

exports.getResourceSchedules = (resourceType, resourceIds, excludeScheduleId, cb) => {
  if (!resourceIds.length) return cb(null, []);
  const resourceColumn = resourceType === 'vehicle' ? 'vehicle_id' : 'driver_id';
  const excludeClause = excludeScheduleId ? ' AND s.id <> ?' : '';
  const params = excludeScheduleId ? [resourceIds, excludeScheduleId] : [resourceIds];
  db.query(
    `SELECT s.id, s.schedule_number, s.${resourceColumn} AS resource_id,
            s.departure_terminal_id, s.arrival_terminal_id,
            s.departure_datetime,
            CASE WHEN r.estimated_duration_minutes > 0
              THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
              ELSE s.arrival_datetime
            END AS arrival_datetime,
            s.status,
           r.name AS route_name,
           departure_terminal.name AS departure_terminal_name,
           arrival_terminal.name AS arrival_terminal_name
     FROM schedules s
     JOIN routes r ON r.id = s.route_id
         JOIN terminals departure_terminal ON departure_terminal.id = s.departure_terminal_id
         JOIN terminals arrival_terminal ON arrival_terminal.id = s.arrival_terminal_id
    WHERE s.${resourceColumn} IN (?) AND s.status <> 'Cancelled'${excludeClause}
     ORDER BY s.departure_datetime ASC, s.id ASC`,
    params,
    cb
  );
};

exports.getRepositionRoutes = (cb) => {
  db.query(
    `SELECT id, name, origin_terminal_id, destination_terminal_id,
            estimated_duration_minutes
     FROM routes
     WHERE status = 'Active' AND estimated_duration_minutes > 0`,
    cb
  );
};

// Overlap rule: existing.departure < newArrival AND newDeparture < existing.arrival
exports.getconflictingvehicles = (depDT, arrDT, excludeId, cb) => {
  db.query(
    `SELECT DISTINCT s.vehicle_id FROM schedules s
     JOIN routes r ON r.id = s.route_id
     WHERE s.status != 'Cancelled' AND s.id != ? AND s.departure_datetime < ?
       AND CASE WHEN r.estimated_duration_minutes > 0
         THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
         ELSE s.arrival_datetime
       END > ?`,
    [excludeId || 0, arrDT, depDT],
    cb
  );
};

exports.getconflictingdrivers = (depDT, arrDT, excludeId, cb) => {
  db.query(
    `SELECT DISTINCT s.driver_id FROM schedules s
     JOIN routes r ON r.id = s.route_id
     WHERE s.status != 'Cancelled' AND s.id != ? AND s.departure_datetime < ?
       AND CASE WHEN r.estimated_duration_minutes > 0
         THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
         ELSE s.arrival_datetime
       END > ?`,
    [excludeId || 0, arrDT, depDT],
    cb
  );
};

exports.createschedule = (s, cb) => {
  const {
    schedule_number, route_id, vehicle_id, driver_id,
    departure_terminal_id, arrival_terminal_id,
    departure_datetime, arrival_datetime, fare
  } = s;

  db.query(
    `INSERT INTO schedules
      (schedule_number, route_id, vehicle_id, driver_id, departure_terminal_id, arrival_terminal_id,
       departure_datetime, arrival_datetime, fare, status)
     VALUES (?,?,?,?,?,?,?,?,?,"Open")`,
    [schedule_number, route_id, vehicle_id, driver_id, departure_terminal_id, arrival_terminal_id,
      departure_datetime, arrival_datetime, fare],
    (err, result) => {
      if (err) return cb(err);
      cb(null, { success: true, insertedId: result.insertId });
    }
  );
};

exports.cancelschedule = (id, cb) => {
  db.query('UPDATE schedules SET status = "Cancelled" WHERE id = ?', [id], cb);
};

exports.replacevehicle = (id, newVehicleId, cb) => {
  db.query('UPDATE schedules SET vehicle_id = ? WHERE id = ?', [newVehicleId, id], cb);
};
