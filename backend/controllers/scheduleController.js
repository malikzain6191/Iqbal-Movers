const Schedule = require('../models/scheduleModel');
const Seat = require('../models/seatModel');
const Route = require('../models/routeModel');
const Booking = require('../models/bookingModel');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const db = require('../config/db');
const { logAudit } = require('../utils/audit');
const { isPositiveId, isValidDateTime } = require('../utils/validation');

function addMinutes(dateTime, minutes) {
  const value = new Date(dateTime);
  value.setMinutes(value.getMinutes() + minutes);
  const pad = (part) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
}

function findRepositionPath(originId, destinationId, routes) {
  if (Number(originId) === Number(destinationId)) return { minutes: 0, route_names: [] };

  const distances = new Map([[Number(originId), 0]]);
  const previous = new Map();
  const visited = new Set();

  while (true) {
    let currentId = null;
    let currentDistance = Infinity;
    for (const [terminalId, distance] of distances) {
      if (!visited.has(terminalId) && distance < currentDistance) {
        currentId = terminalId;
        currentDistance = distance;
      }
    }
    if (currentId === null || currentId === Number(destinationId)) break;
    visited.add(currentId);

    for (const route of routes) {
      if (Number(route.origin_terminal_id) !== currentId) continue;
      const nextId = Number(route.destination_terminal_id);
      const nextDistance = currentDistance + Number(route.estimated_duration_minutes);
      if (nextDistance < (distances.get(nextId) ?? Infinity)) {
        distances.set(nextId, nextDistance);
        previous.set(nextId, { terminalId: currentId, routeName: route.name });
      }
    }
  }

  const minutes = distances.get(Number(destinationId));
  if (!Number.isFinite(minutes)) return null;
  const route_names = [];
  let terminalId = Number(destinationId);
  while (terminalId !== Number(originId)) {
    const step = previous.get(terminalId);
    if (!step) return null;
    route_names.unshift(step.routeName);
    terminalId = step.terminalId;
  }
  return { minutes, route_names };
}

function checkResource(resource, trips, departure, arrival, route, conflicts, repositionRoutes) {
  if (resource.status !== 'Active') return { ...resource, available: false, reason: resource.status };
  if (conflicts.has(resource.id)) return { ...resource, available: false, reason: 'Already assigned during this time' };

  const departureTime = new Date(departure).getTime();
  const arrivalTime = new Date(arrival).getTime();
  const previousTrip = trips
    .filter((trip) => new Date(trip.arrival_datetime).getTime() <= departureTime)
    .at(-1);
  const nextTrip = trips.find((trip) => new Date(trip.departure_datetime).getTime() >= departureTime);
  const currentTerminalId = previousTrip?.arrival_terminal_id || resource.home_terminal_id;

  if (!currentTerminalId) {
    return { ...resource, available: false, reason: 'Starting terminal is not assigned' };
  }
  if (Number(currentTerminalId) !== Number(route.origin_terminal_id)) {
    return {
      ...resource,
      available: false,
      reason: `At ${previousTrip?.arrival_terminal_name || resource.home_terminal_name || 'another terminal'}`
    };
  }
  if (nextTrip && new Date(nextTrip.departure_datetime).getTime() < arrivalTime) {
    return { ...resource, available: false, reason: `Already assigned before arrival at ${nextTrip.departure_terminal_name}` };
  }
  let reposition = null;
  if (nextTrip) {
    reposition = findRepositionPath(route.destination_terminal_id, nextTrip.departure_terminal_id, repositionRoutes);
    if (!reposition) {
      return { ...resource, available: false, reason: `No reposition route to ${nextTrip.departure_terminal_name}` };
    }
    const repositionArrival = arrivalTime + reposition.minutes * 60 * 1000;
    if (repositionArrival > new Date(nextTrip.departure_datetime).getTime()) {
      return {
        ...resource,
        available: false,
        reason: `Needs ${reposition.minutes} min to reach ${nextTrip.departure_terminal_name} before next trip`
      };
    }
  }

  return {
    ...resource,
    available: true,
    reason: '',
    current_terminal_id: currentTerminalId,
    current_terminal_name: previousTrip?.arrival_terminal_name || resource.home_terminal_name,
    next_assignment: nextTrip ? {
      route_name: nextTrip.route_name,
      departure_datetime: nextTrip.departure_datetime,
      departure_terminal_name: nextTrip.departure_terminal_name,
      reposition_minutes: reposition.minutes,
      reposition_routes: reposition.route_names
    } : null
  };
}

function computeAvailability(route, departure, arrival, excludeId, user, cb) {
  Vehicle.getavailabilityvehicles(user, route.origin_terminal_id, (vehicleError, vehicles) => {
    if (vehicleError) return cb(vehicleError);
    Driver.getavailabilitydrivers(user, route.origin_terminal_id, (driverError, drivers) => {
      if (driverError) return cb(driverError);
      Schedule.getconflictingvehicles(departure, arrival, excludeId, (vehicleConflictError, vehicleConflicts) => {
        if (vehicleConflictError) return cb(vehicleConflictError);
        Schedule.getconflictingdrivers(departure, arrival, excludeId, (driverConflictError, driverConflicts) => {
          if (driverConflictError) return cb(driverConflictError);
          Schedule.getResourceSchedules('vehicle', vehicles.map((vehicle) => vehicle.id), excludeId, (vehicleHistoryError, vehicleTrips) => {
            if (vehicleHistoryError) return cb(vehicleHistoryError);
            Schedule.getResourceSchedules('driver', drivers.map((driver) => driver.id), excludeId, (driverHistoryError, driverTrips) => {
              if (driverHistoryError) return cb(driverHistoryError);
              Schedule.getRepositionRoutes((repositionError, repositionRoutes) => {
                if (repositionError) return cb(repositionError);

              const groupByResource = (trips) => trips.reduce((groups, trip) => {
                if (!groups.has(trip.resource_id)) groups.set(trip.resource_id, []);
                groups.get(trip.resource_id).push(trip);
                return groups;
              }, new Map());
              const vehicleTripsById = groupByResource(vehicleTrips);
              const driverTripsById = groupByResource(driverTrips);
              const vehicleConflictIds = new Set(vehicleConflicts.map((trip) => trip.vehicle_id));
              const driverConflictIds = new Set(driverConflicts.map((trip) => trip.driver_id));

              cb(null, {
                route,
                departure_datetime: departure,
                arrival_datetime: arrival,
                vehicles: vehicles.map((vehicle) => checkResource(
                  vehicle, vehicleTripsById.get(vehicle.id) || [], departure, arrival, route, vehicleConflictIds, repositionRoutes
                )),
                drivers: drivers.map((driver) => checkResource(
                  driver, driverTripsById.get(driver.id) || [], departure, arrival, route, driverConflictIds, repositionRoutes
                ))
              });
              });
            });
          });
        });
      });
    });
  });
}

function getActiveRoute(routeId, user, cb) {
  Route.getroutebyIDInScope(routeId, user, (error, rows) => {
    if (error) return cb(error);
    const route = rows[0];
    if (!route || route.status !== 'Active') return cb(null, null);
    if (!(Number(route.distance_km) > 0) || !(Number(route.estimated_duration_minutes) > 0)) {
      return cb(null, { invalidMetrics: true });
    }
    cb(null, route);
  });
}

exports.getAvailability = (req, res) => {
  const { route_id, departure_datetime, exclude_schedule_id } = req.query;
  if (!isPositiveId(route_id) || !isValidDateTime(departure_datetime)) {
    return res.status(400).send({ message: 'A valid route and departure time are required' });
  }
  if (exclude_schedule_id && !isPositiveId(exclude_schedule_id)) {
    return res.status(400).send({ message: 'exclude_schedule_id must be a positive integer' });
  }

  getActiveRoute(route_id, req.user, (routeError, route) => {
    if (routeError) return res.status(500).send({ error: routeError });
    if (!route) return res.status(404).send({ message: 'Active route not found' });
    if (route.invalidMetrics) {
      return res.status(400).send({ message: 'Set a valid distance and travel duration on this route first' });
    }

    const arrival = addMinutes(departure_datetime, Number(route.estimated_duration_minutes));
    computeAvailability(route, departure_datetime, arrival, exclude_schedule_id || 0, req.user, (error, data) => {
      if (error) return res.status(500).send({ error });
      res.json(data);
    });
  });
};

exports.getAllSchedules = (req, res) => {
  Schedule.getallschedules(req.user, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.getScheduleSeats = (req, res) => {
  Schedule.getschedulebyIDInScope(req.params.id, req.user, (scheduleError, schedules) => {
    if (scheduleError) return res.status(500).send({ error: scheduleError });
    if (!schedules.length) return res.status(404).send({ message: 'Schedule not found' });
    Seat.getseatsbyschedule(req.params.id, (err, results) => {
      if (err) return res.status(500).send({ error: err });
      res.json(results);
    });
  });
};

exports.createSchedule = (req, res) => {
  const { route_id, vehicle_id, driver_id, departure_datetime, fare } = req.body;
  if (!isPositiveId(route_id) || !isPositiveId(vehicle_id) || !isPositiveId(driver_id)
    || !isValidDateTime(departure_datetime) || new Date(departure_datetime) <= new Date()
    || !Number.isFinite(Number(fare)) || Number(fare) <= 0) {
    return res.status(400).send({ message: 'Select a valid route, vehicle, driver, future departure and positive fare' });
  }

  getActiveRoute(route_id, req.user, (routeError, route) => {
    if (routeError) return res.status(500).send({ error: routeError });
    if (!route) return res.status(400).send({ message: 'Select an active route in your scope' });
    if (route.invalidMetrics) {
      return res.status(400).send({ message: 'Set a valid distance and travel duration on this route first' });
    }

    const arrival_datetime = addMinutes(departure_datetime, Number(route.estimated_duration_minutes));
    if (req.body.arrival_datetime
      && Math.abs(new Date(req.body.arrival_datetime).getTime() - new Date(arrival_datetime).getTime()) > 60000) {
      return res.status(400).send({ message: 'Arrival time is calculated from the route duration and cannot be overridden' });
    }

    computeAvailability(route, departure_datetime, arrival_datetime, 0, req.user, (availabilityError, availability) => {
      if (availabilityError) return res.status(500).send({ error: availabilityError });
      const vehicle = availability.vehicles.find((resource) => resource.id === Number(vehicle_id));
      const driver = availability.drivers.find((resource) => resource.id === Number(driver_id));
      if (!vehicle?.available) {
        return res.status(409).send({ message: vehicle?.reason || 'Selected vehicle is unavailable for this terminal and time', code: 'VEHICLE_UNAVAILABLE' });
      }
      if (!driver?.available) {
        return res.status(409).send({ message: driver?.reason || 'Selected driver is unavailable for this terminal and time', code: 'DRIVER_UNAVAILABLE' });
      }

      const schedule_number = 'SCH-' + Math.floor(1000 + Math.random() * 9000);
      Schedule.createschedule({
        schedule_number, route_id, vehicle_id, driver_id,
        departure_terminal_id: route.origin_terminal_id,
        arrival_terminal_id: route.destination_terminal_id,
        departure_datetime, arrival_datetime, fare
      }, (createError, result) => {
        if (createError) return res.status(500).send({ error: createError });
        Seat.generateseats(result.insertedId, vehicle.seating_capacity, (seatError) => {
          if (seatError) return res.status(500).send({ error: seatError });
          logAudit(req.user.id, req.user.name, 'Schedule Creation', 'Schedule', result.insertedId, `${route.name} @ ${departure_datetime}`);
          res.status(201).send({ message: 'Schedule created successfully', scheduleId: result.insertedId, schedule_number });
        });
      });
    });
  });
};

exports.cancelSchedule = (req, res) => {
  Schedule.getschedulebyIDInScope(req.params.id, req.user, async (scopeError, schedules) => {
    if (scopeError) return res.status(500).send({ error: scopeError });
    if (!schedules.length) return res.status(404).send({ message: 'Schedule not found' });
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
  });
};

exports.replaceVehicle = (req, res) => {
  const { new_vehicle_id, reason } = req.body;
  if (!isPositiveId(new_vehicle_id)) return res.status(400).send({ message: 'new_vehicle_id must be a positive integer' });

  Schedule.getschedulebyIDInScope(req.params.id, req.user, (scheduleError, schedules) => {
    if (scheduleError) return res.status(500).send({ error: scheduleError });
    const schedule = schedules[0];
    if (!schedule) return res.status(404).send({ message: 'Schedule not found' });
    Route.getroutebyIDInScope(schedule.route_id, req.user, (routeError, routes) => {
      if (routeError) return res.status(500).send({ error: routeError });
      const route = routes[0];
      if (!route) return res.status(404).send({ message: 'Route not found' });
      if (!(Number(route.estimated_duration_minutes) > 0)) {
        return res.status(400).send({ message: 'Set a valid travel duration on this route before replacing a vehicle' });
      }
      const arrival = addMinutes(schedule.departure_datetime, Number(route.estimated_duration_minutes));
      computeAvailability(route, schedule.departure_datetime, arrival, schedule.id, req.user, (availabilityError, availability) => {
        if (availabilityError) return res.status(500).send({ error: availabilityError });
        const vehicle = availability.vehicles.find((resource) => resource.id === Number(new_vehicle_id));
        if (!vehicle?.available) {
          return res.status(409).send({ message: vehicle?.reason || 'Replacement vehicle is unavailable at this terminal and time' });
        }
        const oldVehicleId = schedule.vehicle_id;
        Schedule.replacevehicle(req.params.id, new_vehicle_id, (replaceError) => {
          if (replaceError) return res.status(500).send({ error: replaceError });
          db.query(
            'INSERT INTO vehicle_replacements (schedule_id, old_vehicle_id, new_vehicle_id, reason, replaced_by) VALUES (?,?,?,?,?)',
            [req.params.id, oldVehicleId, new_vehicle_id, reason || null, req.user.id],
            (auditError) => {
              if (auditError) return res.status(500).send({ error: auditError });
              logAudit(req.user.id, req.user.name, 'Vehicle Update', 'Schedule', req.params.id, `${oldVehicleId} → ${new_vehicle_id}`);
              res.send({ message: 'Vehicle replaced successfully. Existing tickets remain valid.' });
            }
          );
        });
      });
    });
  });
};

exports.getIncomingSchedules = (req, res) => {
  Schedule.getincomingschedules(req.user, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};