const Schedule = require('../models/scheduleModel');
const Seat = require('../models/seatModel');
const Route = require('../models/routeModel');
const Booking = require('../models/bookingModel');
const db = require('../config/db');
const { logAudit } = require('../utils/audit');
const { isPositiveId, isValidDateTime } = require('../utils/validation');

function computeAvailability(depDT, arrDT, excludeId, cb) {
  db.query('SELECT * FROM vehicles', (err, vehicles) => {
    if (err) return cb(err);
    db.query('SELECT * FROM drivers', (err2, drivers) => {
      if (err2) return cb(err2);
      Schedule.getconflictingvehicles(depDT, arrDT, excludeId, (err3, vConflicts) => {
        if (err3) return cb(err3);
        Schedule.getconflictingdrivers(depDT, arrDT, excludeId, (err4, dConflicts) => {
          if (err4) return cb(err4);

          const vConflictIds = new Set(vConflicts.map((r) => r.vehicle_id));
          const dConflictIds = new Set(dConflicts.map((r) => r.driver_id));

          const vehicleResults = vehicles.map((v) => {
            if (v.status !== 'Active') return { ...v, available: false, reason: v.status };
            if (vConflictIds.has(v.id)) return { ...v, available: false, reason: 'Already Assigned' };
            return { ...v, available: true, reason: '' };
          });
          const driverResults = drivers.map((d) => {
            if (d.status !== 'Active') return { ...d, available: false, reason: 'Suspended' };
            if (dConflictIds.has(d.id)) return { ...d, available: false, reason: 'Already Assigned' };
            return { ...d, available: true, reason: '' };
          });

          cb(null, { vehicles: vehicleResults, drivers: driverResults });
        });
      });
    });
  });
}

exports.getAvailability = (req, res) => {
  const { departure_datetime, arrival_datetime, exclude_schedule_id } = req.query;
  if (!isValidDateTime(departure_datetime) || !isValidDateTime(arrival_datetime) || new Date(arrival_datetime) <= new Date(departure_datetime)) {
    return res.status(400).send({ message: 'Valid departure and later arrival times are required' });
  }
  if (exclude_schedule_id && !isPositiveId(exclude_schedule_id)) return res.status(400).send({ message: 'exclude_schedule_id must be a positive integer' });
  computeAvailability(departure_datetime, arrival_datetime, exclude_schedule_id || 0, (err, data) => {
    if (err) return res.status(500).send({ error: err });
    res.json(data);
  });
};

exports.getAllSchedules = (req, res) => {
  // Scoping fix (Faisalabad bug): a counter/city_admin only sees schedules
  // DEPARTING from a terminal in their scope — never ones merely arriving there.
  if (req.user.role === 'super_admin') {
    return Schedule.getallschedules(null, (err, results) => {
      if (err) return res.status(500).send({ error: err });
      res.json(results);
    });
  }

  const terminalFilterQuery = req.user.role === 'counter_operator'
    ? 'SELECT id FROM terminals WHERE id = ?'
    : 'SELECT id FROM terminals WHERE city_id = ?';
  const terminalFilterParam = req.user.role === 'counter_operator' ? req.user.terminal_id : req.user.city_id;

  db.query(terminalFilterQuery, [terminalFilterParam], (err, terminals) => {
    if (err) return res.status(500).send({ error: err });
    const ids = terminals.map((t) => t.id);
    Schedule.getallschedules(ids, (err2, results) => {
      if (err2) return res.status(500).send({ error: err2 });
      res.json(results);
    });
  });
};

exports.getScheduleSeats = (req, res) => {
  Seat.getseatsbyschedule(req.params.id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.createSchedule = (req, res) => {
  const { route_id, vehicle_id, driver_id, departure_datetime, arrival_datetime, fare } = req.body;
  const departure = new Date(departure_datetime);
  const arrival = new Date(arrival_datetime);
  if (!isPositiveId(route_id) || !isPositiveId(vehicle_id) || !isPositiveId(driver_id) || !isValidDateTime(departure_datetime) || !isValidDateTime(arrival_datetime) || arrival <= departure || departure < new Date() || !Number.isFinite(Number(fare)) || Number(fare) <= 0) {
    return res.status(400).send({ message: 'Select a valid route, vehicle, driver, future departure, later arrival, and positive fare' });
  }

  computeAvailability(departure_datetime, arrival_datetime, 0, (err, avail) => {
    if (err) return res.status(500).send({ error: err });

    const v = avail.vehicles.find((x) => x.id === Number(vehicle_id));
    const d = avail.drivers.find((x) => x.id === Number(driver_id));
    if (!v?.available) return res.status(409).send({ message: 'Selected vehicle is not available for this time slot', code: 'VEHICLE_CONFLICT' });
    if (!d?.available) return res.status(409).send({ message: 'Selected driver is not available for this time slot', code: 'DRIVER_CONFLICT' });

    Route.getroutebyID(route_id, (err2, routeResults) => {
      if (err2) return res.status(500).send({ error: err2 });
      const route = routeResults[0];
      if (!route) return res.status(400).send({ message: 'Invalid route_id' });

      const schedule_number = 'SCH-' + Math.floor(1000 + Math.random() * 9000);
      Schedule.createschedule({
        schedule_number, route_id, vehicle_id, driver_id,
        departure_terminal_id: route.origin_terminal_id,
        arrival_terminal_id: route.destination_terminal_id,
        departure_datetime, arrival_datetime, fare
      }, (err3, result) => {
        if (err3) return res.status(500).send({ error: err3 });

        Seat.generateseats(result.insertedId, v.seating_capacity, (err4) => {
          if (err4) return res.status(500).send({ error: err4 });
          logAudit(req.user.id, req.user.name, 'Schedule Creation', 'Schedule', result.insertedId, `${route.name} @ ${departure_datetime}`);
          res.status(201).send({ message: 'Schedule created successfully', scheduleId: result.insertedId, schedule_number });
        });
      });
    });
  });
};

exports.cancelSchedule = async (req, res) => {
  try {
    const refundResult = await Booking.cancelbookingsforschedule(req.params.id, req.user.id);
    Schedule.cancelschedule(req.params.id, (err) => {
      if (err) return res.status(500).send({ error: err });
      logAudit(req.user.id, req.user.name, 'Schedule Cancellation', 'Schedule', req.params.id, `${refundResult.count} booking(s) refunded`);
      res.send({ message: 'Schedule cancelled', bookings_refunded: refundResult.count, total_refunded: refundResult.total });
    });
  } catch (err) {
    res.status(500).send({ error: err.message || err });
  }
};

exports.replaceVehicle = (req, res) => {
  const { new_vehicle_id, reason } = req.body;
  if (!new_vehicle_id) return res.status(400).send({ message: 'new_vehicle_id is required' });

  Schedule.getschedulebyID(req.params.id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    const schedule = results[0];
    if (!schedule) return res.status(404).send({ message: 'Schedule not found' });

    const oldVehicleId = schedule.vehicle_id;
    Schedule.replacevehicle(req.params.id, new_vehicle_id, (err2) => {
      if (err2) return res.status(500).send({ error: err2 });

      db.query(
        'INSERT INTO vehicle_replacements (schedule_id, old_vehicle_id, new_vehicle_id, reason, replaced_by) VALUES (?,?,?,?,?)',
        [req.params.id, oldVehicleId, new_vehicle_id, reason || null, req.user.id],
        (err3) => {
          if (err3) return res.status(500).send({ error: err3 });
          logAudit(req.user.id, req.user.name, 'Vehicle Update', 'Schedule', req.params.id, `${oldVehicleId} → ${new_vehicle_id}`);
          res.send({ message: 'Vehicle replaced successfully. Existing tickets remain valid.' });
        }
      );
    });
  });
};
