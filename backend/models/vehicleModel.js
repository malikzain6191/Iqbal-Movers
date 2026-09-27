const db = require('../config/db');

exports.getallvehicle = (cb) => {
  db.query('SELECT * FROM vehicles', cb);
};

exports.getvehiclebyID = (id, cb) => {
  db.query('SELECT * FROM vehicles WHERE id = ?', [id], cb);
};

exports.createvehicle = (v, cb) => {
  const {
    vehicle_number, registration_number, chassis_number, engine_number,
    registration_date, bus_name, vehicle_type, seating_capacity
  } = v;

  db.query(
    'SELECT id FROM vehicles WHERE LOWER(TRIM(vehicle_number)) = LOWER(?) OR LOWER(TRIM(registration_number)) = LOWER(?)',
    [vehicle_number, registration_number],
    (err, results) => {
      if (err) return cb(err);
      if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

      db.query(
        `INSERT INTO vehicles (vehicle_number, registration_number, chassis_number, engine_number,
          registration_date, bus_name, vehicle_type, seating_capacity, status)
         VALUES (?,?,?,?,?,?,?,?,"Active")`,
        [vehicle_number, registration_number, chassis_number || null, engine_number || null,
          registration_date || null, bus_name || vehicle_number, vehicle_type, seating_capacity],
        (err2, result2) => {
          if (err2) return cb(err2);
          cb(null, { success: true, insertedId: result2.insertId });
        }
      );
    }
  );
};

exports.updatevehiclestatus = (id, newStatus, reason, changedBy, cb) => {
  db.query('SELECT status FROM vehicles WHERE id = ?', [id], (err, results) => {
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
