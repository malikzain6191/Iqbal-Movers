const db = require('../config/db');

exports.todaystats = (cb) => {
  db.query(
    `SELECT
      (SELECT COUNT(*) FROM schedules WHERE DATE(departure_datetime) = CURDATE()) AS trips_today,
      (SELECT COALESCE(SUM(total_amount),0) FROM bookings WHERE booking_date = CURDATE() AND status = 'Booked') AS revenue_today,
      (SELECT COUNT(*) FROM bookings b JOIN booking_seats bs ON bs.booking_id = b.id
         WHERE b.booking_date = CURDATE() AND b.status = 'Booked') AS tickets_today,
      (SELECT COUNT(*) FROM routes WHERE status = 'Active') AS active_routes`,
    cb
  );
};

exports.upcomingdepartures = (cb) => {
  db.query(
    `SELECT s.id, s.departure_datetime, s.fare, r.name AS route_name, v.vehicle_number, d.name AS driver_name
     FROM schedules s
     JOIN routes r ON r.id = s.route_id
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN drivers d ON d.id = s.driver_id
     WHERE s.status = 'Open' AND s.departure_datetime > NOW()
     ORDER BY s.departure_datetime ASC
     LIMIT 5`,
    cb
  );
};

// Raw bookings with a per-booking seat count, used as the base for every
// other report below (aggregated in JS rather than heavier joined SQL —
// fine at moderate volume, revisit with summary tables once traffic grows).
exports.rawbookings = (counterUserId, cb) => {
  let sql = `
    SELECT b.id, b.booking_date, b.status, b.total_amount, b.schedule_id, b.counter_user_id,
           (SELECT COUNT(*) FROM booking_seats WHERE booking_id = b.id) AS seat_count
    FROM bookings b`;
  const params = [];
  if (counterUserId) {
    sql += ' WHERE b.counter_user_id = ?';
    params.push(counterUserId);
  }
  db.query(sql, params, cb);
};

exports.schedulesbasic = (cb) => {
  db.query('SELECT id, route_id, vehicle_id, driver_id FROM schedules', cb);
};

exports.seatcountsbyschedule = (cb) => {
  db.query('SELECT schedule_id, COUNT(*) AS total FROM seats GROUP BY schedule_id', cb);
};

exports.routesbasic = (cb) => db.query('SELECT id, name FROM routes', cb);
exports.vehiclesbasic = (cb) => db.query('SELECT id, vehicle_number FROM vehicles', cb);
exports.driversbasic = (cb) => db.query('SELECT id, name FROM drivers', cb);
exports.usersbasic = (cb) => db.query('SELECT id, name FROM users', cb);
