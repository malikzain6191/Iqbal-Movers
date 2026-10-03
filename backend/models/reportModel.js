const db = require('../config/db');
const {
  bookingScope, driverScope, routeScope, scheduleScope, userScope, vehicleScope
} = require('../utils/accessScope');

exports.todaystats = (user, cb) => {
  const schedules = scheduleScope(user, 's');
  const bookings = bookingScope(user, 'b', 's');
  const routes = routeScope(user, 'r');
  db.query(
    `SELECT
      (SELECT COUNT(*) FROM schedules s
       WHERE ${schedules.sql} AND DATE(s.departure_datetime) = CURDATE()) AS trips_today,
      (SELECT COALESCE(SUM(b.total_amount),0) FROM bookings b
       JOIN schedules s ON s.id = b.schedule_id
       WHERE ${bookings.sql} AND b.booking_date = CURDATE() AND b.status = 'Booked') AS revenue_today,
      (SELECT COUNT(*) FROM bookings b
       JOIN schedules s ON s.id = b.schedule_id
       JOIN booking_seats bs ON bs.booking_id = b.id
       WHERE ${bookings.sql} AND b.booking_date = CURDATE() AND b.status = 'Booked') AS tickets_today,
      (SELECT COUNT(*) FROM routes r
       WHERE ${routes.sql} AND r.status = 'Active') AS active_routes`,
    [...schedules.params, ...bookings.params, ...bookings.params, ...routes.params],
    cb
  );
};

exports.upcomingevents = (user, cb) => {
  let departureScope = { sql: '1 = 0', params: [] };
  let arrivalScope = { sql: '1 = 0', params: [] };
  if (user?.role === 'super_admin') {
    departureScope = { sql: '1 = 1', params: [] };
    arrivalScope = { sql: '1 = 1', params: [] };
  } else if (user?.role === 'city_admin' && user.city_id) {
    departureScope = { sql: 'departure.city_id = ?', params: [user.city_id] };
    arrivalScope = { sql: 'arrival.city_id = ?', params: [user.city_id] };
  } else if (user?.role === 'counter_operator' && user.terminal_id) {
    departureScope = { sql: 's.departure_terminal_id = ?', params: [user.terminal_id] };
    arrivalScope = { sql: 's.arrival_terminal_id = ?', params: [user.terminal_id] };
  }

  db.query(
    `SELECT upcoming.* FROM (
       SELECT s.id, s.route_id, s.departure_datetime, s.fare, r.name AS route_name,
              v.vehicle_number, v.bus_name, v.registration_number, d.id AS driver_id,
              d.name AS driver_name, departure.name AS departure_terminal_name,
              arrival.name AS arrival_terminal_name, departure_city.name AS departure_city_name,
              arrival_city.name AS arrival_city_name, 'Departure' AS direction,
              s.departure_datetime AS event_datetime
       FROM schedules s
       JOIN routes r ON r.id = s.route_id
       JOIN vehicles v ON v.id = s.vehicle_id
       JOIN drivers d ON d.id = s.driver_id
       JOIN terminals departure ON departure.id = s.departure_terminal_id
       JOIN cities departure_city ON departure_city.id = departure.city_id
       JOIN terminals arrival ON arrival.id = s.arrival_terminal_id
       JOIN cities arrival_city ON arrival_city.id = arrival.city_id
       WHERE ${departureScope.sql} AND s.status <> 'Cancelled' AND s.departure_datetime > NOW()
       UNION ALL
       SELECT s.id, s.route_id, s.departure_datetime, s.fare, r.name AS route_name,
              v.vehicle_number, v.bus_name, v.registration_number, d.id AS driver_id,
              d.name AS driver_name, departure.name AS departure_terminal_name,
              arrival.name AS arrival_terminal_name, departure_city.name AS departure_city_name,
              arrival_city.name AS arrival_city_name, 'Arrival' AS direction,
              CASE WHEN r.estimated_duration_minutes > 0
                THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
                ELSE s.arrival_datetime
              END AS event_datetime
       FROM schedules s
       JOIN routes r ON r.id = s.route_id
       JOIN vehicles v ON v.id = s.vehicle_id
       JOIN drivers d ON d.id = s.driver_id
       JOIN terminals departure ON departure.id = s.departure_terminal_id
       JOIN cities departure_city ON departure_city.id = departure.city_id
       JOIN terminals arrival ON arrival.id = s.arrival_terminal_id
       JOIN cities arrival_city ON arrival_city.id = arrival.city_id
       WHERE ${arrivalScope.sql} AND s.status <> 'Cancelled'
         AND CASE WHEN r.estimated_duration_minutes > 0
           THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
           ELSE s.arrival_datetime
         END > NOW()
     ) upcoming
     ORDER BY upcoming.event_datetime ASC, upcoming.id ASC
     LIMIT 10`,
    [...departureScope.params, ...arrivalScope.params],
    cb
  );
};

// Raw bookings with a per-booking seat count, used as the base for every
// other report below (aggregated in JS rather than heavier joined SQL —
// fine at moderate volume, revisit with summary tables once traffic grows).
exports.rawbookings = (user, cb) => {
  const scope = bookingScope(user, 'b', 's');
  let sql = `
    SELECT b.id, b.booking_date, b.status, b.total_amount, b.schedule_id, b.counter_user_id,
           (SELECT COUNT(*) FROM booking_seats WHERE booking_id = b.id) AS seat_count
    FROM bookings b
    JOIN schedules s ON s.id = b.schedule_id
    WHERE ${scope.sql}`;
  db.query(sql, scope.params, cb);
};

exports.schedulesbasic = (user, cb) => {
  const scope = scheduleScope(user, 's');
  db.query(`SELECT s.id, s.route_id, s.vehicle_id, s.driver_id FROM schedules s WHERE ${scope.sql}`, scope.params, cb);
};

exports.seatcountsbyschedule = (user, cb) => {
  const scope = scheduleScope(user, 's');
  db.query(
    `SELECT seats.schedule_id, COUNT(*) AS total FROM seats
     JOIN schedules s ON s.id = seats.schedule_id
     WHERE ${scope.sql} GROUP BY seats.schedule_id`,
    scope.params,
    cb
  );
};

exports.routesbasic = (user, cb) => {
  const scope = routeScope(user, 'r');
  db.query(`SELECT r.id, r.name FROM routes r WHERE ${scope.sql}`, scope.params, cb);
};

exports.vehiclesbasic = (user, cb) => {
  const scope = vehicleScope(user, 'v');
  db.query(`SELECT v.id, v.vehicle_number, v.registration_number FROM vehicles v WHERE ${scope.sql}`, scope.params, cb);
};

exports.driversbasic = (user, cb) => {
  const scope = driverScope(user, 'd');
  db.query(`SELECT d.id, d.name FROM drivers d WHERE ${scope.sql}`, scope.params, cb);
};

exports.usersbasic = (user, cb) => {
  const scope = userScope(user, 'u');
  db.query(`SELECT u.id, u.name FROM users u WHERE ${scope.sql}`, scope.params, cb);
};

exports.getTripHistory = ({ dateScope, driverId, vehicleId }, cb) => {
  const conditions = [];
  const params = [];
  if (dateScope === 'today') conditions.push('DATE(s.departure_datetime) = CURDATE()');
  if (driverId) {
    conditions.push('s.driver_id = ?');
    params.push(driverId);
  }
  if (vehicleId) {
    conditions.push('s.vehicle_id = ?');
    params.push(vehicleId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.query(
    `SELECT s.id, s.schedule_number, s.departure_datetime,
            CASE WHEN r.estimated_duration_minutes > 0
              THEN DATE_ADD(s.departure_datetime, INTERVAL r.estimated_duration_minutes MINUTE)
              ELSE s.arrival_datetime
            END AS arrival_datetime,
            s.status, s.fare, r.name AS route_name, r.distance_km,
            r.estimated_duration_minutes, v.id AS vehicle_id,
            v.vehicle_number, v.bus_name, v.registration_number,
            d.id AS driver_id, d.name AS driver_name,
            from_city.name AS departure_city_name,
            departure_terminal.name AS departure_terminal_name,
            to_city.name AS arrival_city_name,
            arrival_terminal.name AS arrival_terminal_name
     FROM schedules s
     JOIN routes r ON r.id = s.route_id
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN drivers d ON d.id = s.driver_id
     JOIN terminals departure_terminal ON departure_terminal.id = s.departure_terminal_id
     JOIN cities from_city ON from_city.id = departure_terminal.city_id
     JOIN terminals arrival_terminal ON arrival_terminal.id = s.arrival_terminal_id
     JOIN cities to_city ON to_city.id = arrival_terminal.city_id
     ${where}
     ORDER BY s.departure_datetime DESC, s.id DESC`,
    params,
    cb
  );
};
