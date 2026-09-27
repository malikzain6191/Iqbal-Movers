const pool = require('../config/db');
const promisePool = pool.promise(); // wraps the SAME pool; callback-style queries elsewhere in the app keep working unaffected

// ---------------------------------------------------------------------
// This is the one model in the project that deviates from the plain
// db.query(sql, params, cb) pattern. A booking has to: lock the schedule
// row, lock every requested seat row, validate all of them are still
// available, then write 4-5 related tables — all inside ONE transaction,
// or a rollback if any seat turns out to be taken. That's not something
// you can safely do with nested callbacks without it becoming unreadable
// and error-prone, so this function uses async/await internally via
// pool.promise(). Every OTHER model in this project stays callback-style.
// ---------------------------------------------------------------------

exports.createbooking = async ({ schedule_id, passengers, counter_user_id, terminal_id }) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [scheduleRows] = await connection.query('SELECT * FROM schedules WHERE id = ? FOR UPDATE', [schedule_id]);
    const schedule = scheduleRows[0];
    if (!schedule || schedule.status !== 'Open') {
      throw { code: 'SCHEDULE_NOT_OPEN', message: 'This schedule is not open for booking.' };
    }

    const seatIdByNumber = {};
    for (const p of passengers) {
      const [seatRows] = await connection.query(
        'SELECT * FROM seats WHERE schedule_id = ? AND seat_number = ? FOR UPDATE',
        [schedule_id, p.seat_number]
      );
      const seat = seatRows[0];
      if (!seat || seat.status !== 'Available') {
        throw { code: 'SEAT_ALREADY_BOOKED', message: `Seat ${p.seat_number} is no longer available.` };
      }
      seatIdByNumber[p.seat_number] = seat.id;
    }

    const total_amount = schedule.fare * passengers.length;
    const booking_number = 'IQB-' + Date.now();
    const ticket_number = 'IQT-' + Math.floor(10000 + Math.random() * 89999);

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings
        (booking_number, ticket_number, schedule_id, counter_user_id, terminal_id, fare_per_seat, total_amount, status, booking_date)
       VALUES (?,?,?,?,?,?,?, "Booked", CURDATE())`,
      [booking_number, ticket_number, schedule_id, counter_user_id, terminal_id, schedule.fare, total_amount]
    );
    const bookingId = bookingResult.insertId;

    for (const p of passengers) {
      const [passengerResult] = await connection.query(
        'INSERT INTO passengers (name, cnic, mobile_number, gender) VALUES (?,?,?,?)',
        [p.name, p.cnic || null, p.mobile_number || null, p.gender || null]
      );
      await connection.query(
        'INSERT INTO booking_seats (booking_id, seat_id, passenger_id, seat_number) VALUES (?,?,?,?)',
        [bookingId, seatIdByNumber[p.seat_number], passengerResult.insertId, p.seat_number]
      );
      await connection.query('UPDATE seats SET status = "Booked" WHERE id = ?', [seatIdByNumber[p.seat_number]]);
    }

    await connection.query(
      'INSERT INTO payments (booking_id, amount, payment_method, collected_by) VALUES (?,?,?,?)',
      [bookingId, total_amount, 'Cash', counter_user_id]
    );

    await connection.commit();
    return { bookingId, booking_number, ticket_number, total_amount };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

exports.cancelbooking = async (bookingId, reason, processedBy) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [bookingId]);
    const booking = rows[0];
    if (!booking) throw { code: 'NOT_FOUND', message: 'Booking not found.' };
    if (booking.status !== 'Booked') throw { code: 'INVALID_STATE', message: 'Only an active booking can be cancelled.' };

    await connection.query('UPDATE bookings SET status = "Refunded" WHERE id = ?', [bookingId]);
    await connection.query(
      'INSERT INTO refunds (booking_id, amount, reason, processed_by) VALUES (?,?,?,?)',
      [bookingId, booking.total_amount, reason, processedBy]
    );
    await connection.query(
      `UPDATE seats s JOIN booking_seats bs ON bs.seat_id = s.id
       SET s.status = "Available" WHERE bs.booking_id = ?`,
      [bookingId]
    );

    await connection.commit();
    return { booking_id: bookingId, refund_amount: booking.total_amount };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

exports.cancelbookingsforschedule = async (scheduleId, processedBy) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [bookings] = await connection.query(
      'SELECT * FROM bookings WHERE schedule_id = ? AND status = "Booked" FOR UPDATE',
      [scheduleId]
    );

    let total = 0;
    for (const b of bookings) {
      await connection.query('UPDATE bookings SET status = "Refunded" WHERE id = ?', [b.id]);
      await connection.query(
        'INSERT INTO refunds (booking_id, amount, reason, processed_by) VALUES (?,?,?,?)',
        [b.id, b.total_amount, 'Schedule cancelled', processedBy]
      );
      total += Number(b.total_amount);
    }

    if (bookings.length) {
      await connection.query(
        `UPDATE seats s JOIN booking_seats bs ON bs.seat_id = s.id JOIN bookings b ON b.id = bs.booking_id
         SET s.status = "Available" WHERE b.schedule_id = ? AND b.status = "Refunded"`,
        [scheduleId]
      );
    }

    await connection.commit();
    return { count: bookings.length, total };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ---- plain read queries below stay callback-style, consistent with the rest of the app ----

exports.getbookings = (counterUserId, cb) => {
  if (counterUserId) {
    pool.query('SELECT * FROM bookings WHERE counter_user_id = ? ORDER BY created_at DESC', [counterUserId], cb);
  } else {
    pool.query('SELECT * FROM bookings ORDER BY created_at DESC', cb);
  }
};

exports.getmanifest = (scheduleId, cb) => {
  pool.query(
    `SELECT bs.seat_number, p.name, p.cnic, p.mobile_number
     FROM bookings b
     JOIN booking_seats bs ON bs.booking_id = b.id
     JOIN passengers p ON p.id = bs.passenger_id
     WHERE b.schedule_id = ? AND b.status = "Booked"
     ORDER BY bs.seat_number`,
    [scheduleId],
    cb
  );
};
