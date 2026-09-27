const db = require('../config/db');

exports.getallschedules = (departureTerminalIds, cb) => {
  if (departureTerminalIds && departureTerminalIds.length) {
    db.query('SELECT * FROM schedules WHERE departure_terminal_id IN (?)', [departureTerminalIds], cb);
  } else {
    db.query('SELECT * FROM schedules', cb);
  }
};

exports.getschedulebyID = (id, cb) => {
  db.query('SELECT * FROM schedules WHERE id = ?', [id], cb);
};

// Overlap rule: existing.departure < newArrival AND newDeparture < existing.arrival
exports.getconflictingvehicles = (depDT, arrDT, excludeId, cb) => {
  db.query(
    `SELECT DISTINCT vehicle_id FROM schedules
     WHERE status != 'Cancelled' AND id != ? AND departure_datetime < ? AND arrival_datetime > ?`,
    [excludeId || 0, arrDT, depDT],
    cb
  );
};

exports.getconflictingdrivers = (depDT, arrDT, excludeId, cb) => {
  db.query(
    `SELECT DISTINCT driver_id FROM schedules
     WHERE status != 'Cancelled' AND id != ? AND departure_datetime < ? AND arrival_datetime > ?`,
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
