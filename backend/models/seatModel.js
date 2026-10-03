const db = require('../config/db');

// Generates the seat layout for a schedule once, right after it's created.
// 4 seats per "row" (1A,1B,1C,1D, 2A,2B,...) matching the vehicle's capacity.
exports.generateseats = (scheduleId, capacity, cb) => {
  const letters = ['A', 'B', 'C', 'D'];
  const seatNumbers = [];
  let row = 1;
  while (seatNumbers.length < capacity) {
    for (const l of letters) {
      if (seatNumbers.length >= capacity) break;
      seatNumbers.push(`${row}${l}`);
    }
    row++;
  }
  const values = seatNumbers.map((seat_number) => [scheduleId, seat_number, 'Available']);
  db.query('INSERT INTO seats (schedule_id, seat_number, status) VALUES ?', [values], cb);
};

exports.getseatsbyschedule = (scheduleId, cb) => {
  db.query(
    `SELECT seat.id, seat.seat_number, seat.status,
            (SELECT passenger.gender
             FROM booking_seats booked_seat
             JOIN bookings booking ON booking.id = booked_seat.booking_id
             JOIN passengers passenger ON passenger.id = booked_seat.passenger_id
             WHERE booked_seat.seat_id = seat.id AND booking.status = 'Booked'
             LIMIT 1) AS gender
     FROM seats seat
     WHERE seat.schedule_id = ?
     ORDER BY seat.seat_number`,
    [scheduleId],
    cb
  );
};
