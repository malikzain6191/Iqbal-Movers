const db = require('../config/db');
const { vehicleScope } = require('../utils/accessScope');

exports.getallvehicle = (user, cb) => {
  const scope = vehicleScope(user, 'v');
  db.query(
    `SELECT v.*, home.name AS home_terminal_name
     FROM vehicles v
     LEFT JOIN terminals home ON home.id = v.home_terminal_id
     WHERE ${scope.sql}`,
    scope.params,
    cb
  );
};

exports.getavailabilityvehicles = (user, originTerminalId, cb) => {
  if (user?.role !== 'city_admin') return exports.getallvehicle(user, cb);
  db.query(
    `SELECT DISTINCT v.*, home.name AS home_terminal_name
     FROM vehicles v
     JOIN terminals origin ON origin.id = ?
     LEFT JOIN terminals home ON home.id = v.home_terminal_id
     WHERE v.city_id = origin.city_id OR home.city_id = origin.city_id
       OR EXISTS (
         SELECT 1 FROM schedules assigned
         JOIN terminals assigned_origin ON assigned_origin.id = assigned.departure_terminal_id
         JOIN terminals assigned_destination ON assigned_destination.id = assigned.arrival_terminal_id
         WHERE assigned.vehicle_id = v.id AND assigned.status <> 'Cancelled'
           AND (assigned_origin.city_id = origin.city_id OR assigned_destination.city_id = origin.city_id)
       )`,
    [originTerminalId],
    cb
  );
};

exports.getvehiclebyID = (id, cb) => {
  db.query('SELECT * FROM vehicles WHERE id = ?', [id], cb);
};

exports.getvehiclebyIDInScope = (id, user, cb) => {
  const scope = vehicleScope(user, 'v');
  db.query(`SELECT v.* FROM vehicles v WHERE v.id = ? AND ${scope.sql}`, [id, ...scope.params], cb);
};

exports.createvehicle = (v, cb) => {
  const {
    vehicle_number, registration_number, chassis_number, engine_number,
    registration_date, bus_name, city_id, home_terminal_id, vehicle_type, seating_capacity
  } = v;

  db.query(
    'SELECT id FROM vehicles WHERE LOWER(TRIM(vehicle_number)) = LOWER(?) OR LOWER(TRIM(registration_number)) = LOWER(?)',
    [vehicle_number, registration_number],
    (err, results) => {
      if (err) return cb(err);
      if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

      db.query(
        `INSERT INTO vehicles (vehicle_number, registration_number, chassis_number, engine_number,
          registration_date, bus_name, city_id, home_terminal_id, vehicle_type, seating_capacity, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,"Active")`,
        [vehicle_number, registration_number, chassis_number || null, engine_number || null,
          registration_date || null, bus_name || vehicle_number, city_id || null, home_terminal_id, vehicle_type, seating_capacity],
        (err2, result2) => {
          if (err2) return cb(err2);
          cb(null, { success: true, insertedId: result2.insertId });
        }
      );
    }
  );
};

exports.updatevehiclestatus = (id, newStatus, reason, changedBy, user, cb) => {
  const scope = vehicleScope(user, 'v');
  db.query(`SELECT v.status FROM vehicles v WHERE v.id = ? AND ${scope.sql}`, [id, ...scope.params], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) return cb(null, { success: false, reason: 'NOT_FOUND' });

    const oldStatus = results[0].status;
    db.query('UPDATE vehicles SET status = ? WHERE id = ?', [newStatus, id], (err2) => {
      if (err2) return cb(err2);

      db.query(
        'INSERT INTO vehicle_status_history (vehicle_id, old_status, new_status, reason, changed_by) VALUES (?,?,?,?,?)',
        [id, oldStatus, newStatus, reason || null, changedBy],
        (err3) => {
          if (err3) return cb(err3);
          cb(null, { success: true, oldStatus, newStatus });
        }
      );
    });
  });
};
