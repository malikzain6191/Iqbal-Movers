const Booking = require('../models/bookingModel');
const { logAudit } = require('../utils/audit');
const { isCnic, isPersonName, isPhone, normalizeText } = require('../utils/validation');

// NOTE: in-memory only. Fine for a single-instance dev/staging server, but
// will NOT protect against duplicate submits once you run more than one
// app instance, or after a restart. For production, persist keys in a small
// table (idempotency_keys: key, response_json, created_at + a TTL cleanup
// job) or in Redis instead.
const idempotencyCache = new Map();

exports.createBooking = async (req, res) => {
  const idKey = req.headers['idempotency-key'];
  if (idKey && idempotencyCache.has(idKey)) {
    return res.status(200).json(idempotencyCache.get(idKey));
  }

  const { schedule_id, passengers } = req.body;
  if (!Number.isInteger(Number(schedule_id)) || Number(schedule_id) < 1 || !Array.isArray(passengers) || passengers.length === 0) {
    return res.status(400).send({ message: 'schedule_id and at least one passenger are required' });
  }
  if (passengers.some((p) => !p || !/^\d{1,2}[A-D]$/i.test(String(p.seat_number || '')) || !isPersonName(normalizeText(p.name)))) {
    return res.status(400).send({ message: 'Every passenger needs a valid seat number and name' });
  }
  if (new Set(passengers.map((p) => String(p.seat_number).toUpperCase())).size !== passengers.length) return res.status(400).send({ message: 'A seat can only appear once per booking' });
  if (passengers.some((p) => (p.cnic && !isCnic(String(p.cnic))) || (p.mobile_number && !isPhone(String(p.mobile_number))) || (p.gender && !['M', 'F'].includes(p.gender)))) {
    return res.status(400).send({ message: 'Passenger CNIC, mobile number, or gender is invalid' });
  }

  const cleanedPassengers = passengers.map((passenger) => ({
    ...passenger,
    seat_number: String(passenger.seat_number).toUpperCase(),
    name: normalizeText(passenger.name)
  }));

  try {
    const result = await Booking.createbooking({
      schedule_id,
      passengers: cleanedPassengers,
      counter_user_id: req.user.id,
      terminal_id: req.user.terminal_id || req.body.terminal_id
    });

    const responseBody = { message: 'Booking created successfully', ...result };
    if (idKey) idempotencyCache.set(idKey, responseBody);

    logAudit(req.user.id, req.user.name, 'Booking Created', 'Booking', result.bookingId, `${result.ticket_number} · ${cleanedPassengers.length} seat(s)`);
    res.status(201).json(responseBody);
  } catch (err) {
    if (err.code === 'SEAT_ALREADY_BOOKED' || err.code === 'SCHEDULE_NOT_OPEN') {
      return res.status(409).send({ message: err.message, code: err.code });
    }
    res.status(500).send({ error: err.message || err });
  }
};

exports.listBookings = (req, res) => {
  const counterFilter = req.user.role === 'counter_operator' ? req.user.id : null;
  Booking.getbookings(counterFilter, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.cancelBooking = async (req, res) => {
  try {
    const result = await Booking.cancelbooking(req.params.id, req.body.reason || 'Not specified', req.user.id);
    logAudit(req.user.id, req.user.name, 'Refund Issued', 'Booking', req.params.id, `Rs ${result.refund_amount}`);
    res.json({ message: 'Booking cancelled and refunded', ...result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).send({ message: err.message });
    if (err.code === 'INVALID_STATE') return res.status(400).send({ message: err.message });
    res.status(500).send({ error: err.message || err });
  }
};

exports.getManifest = (req, res) => {
  Booking.getmanifest(req.params.id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json({ schedule_id: req.params.id, passengers: results });
  });
};
