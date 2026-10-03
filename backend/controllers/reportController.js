const Report = require('../models/reportModel');
const { isPositiveId } = require('../utils/validation');

function loadContext(user, cb) {
  Report.rawbookings(user, (err, bookings) => {
    if (err) return cb(err);
    Report.schedulesbasic(user, (err2, schedules) => {
      if (err2) return cb(err2);
      Report.seatcountsbyschedule(user, (err3, seatCounts) => {
        if (err3) return cb(err3);
        cb(null, { bookings, schedules, seatCounts });
      });
    });
  });
}

exports.getTodayDashboard = (req, res) => {
  Report.todaystats(req.user, (err, statsRows) => {
    if (err) return res.status(500).send({ error: err });
    Report.upcomingevents(req.user, (err2, upcoming) => {
      if (err2) return res.status(500).send({ error: err2 });
      res.json({ ...statsRows[0], upcoming });
      // NOTE: occupancy_pct is left out here deliberately — it needs total
      // seat capacity for today's trips, which is one more join away. Add
      // it once you also need it, rather than computing it unused.
    });
  });
};

exports.getDailySales = (req, res) => {
  loadContext(req.user, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    const byDate = {};
    ctx.bookings.forEach((b) => {
      if (b.status === 'Cancelled') return;
      const key = String(b.booking_date).slice(0, 10);
      byDate[key] = byDate[key] || { tickets: 0, revenue: 0 };
      byDate[key].tickets += b.seat_count;
      if (b.status === 'Booked') byDate[key].revenue += Number(b.total_amount);
    });
    res.json(Object.entries(byDate).map(([date, v]) => ({ date, ...v })));
  });
};

exports.getRouteRevenue = (req, res) => {
  loadContext(req.user, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.routesbasic(req.user, (err2, routes) => {
      if (err2) return res.status(500).send({ error: err2 });

      const schedIdsByRoute = {};
      ctx.schedules.forEach((s) => {
        schedIdsByRoute[s.route_id] = schedIdsByRoute[s.route_id] || [];
        schedIdsByRoute[s.route_id].push(s.id);
      });
      const seatCountMap = {};
      ctx.seatCounts.forEach((sc) => { seatCountMap[sc.schedule_id] = sc.total; });

      const result = routes.map((r) => {
        const schedIds = schedIdsByRoute[r.id] || [];
        const relevant = ctx.bookings.filter((b) => schedIds.includes(b.schedule_id) && b.status === 'Booked');
        const passengers = relevant.reduce((a, b) => a + b.seat_count, 0);
        const revenue = relevant.reduce((a, b) => a + Number(b.total_amount), 0);
        const capacity = schedIds.reduce((a, id) => a + (seatCountMap[id] || 0), 0);
        return { route: r.name, passengers, revenue, occupancy_pct: capacity ? Math.round((100 * passengers) / capacity) : 0 };
      });
      res.json(result);
    });
  });
};

exports.getVehicleUtilization = (req, res) => {
  loadContext(req.user, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.vehiclesbasic(req.user, (err2, vehicles) => {
      if (err2) return res.status(500).send({ error: err2 });

      const schedIdsByVehicle = {};
      ctx.schedules.forEach((s) => {
        schedIdsByVehicle[s.vehicle_id] = schedIdsByVehicle[s.vehicle_id] || [];
        schedIdsByVehicle[s.vehicle_id].push(s.id);
      });

      const result = vehicles.map((v) => {
        const schedIds = schedIdsByVehicle[v.id] || [];
        const relevant = ctx.bookings.filter((b) => schedIds.includes(b.schedule_id) && b.status === 'Booked');
        return {
          vehicle: [v.vehicle_number, v.registration_number]
            .filter(Boolean)
            .join(' · '),
          trips: schedIds.length,
          revenue: relevant.reduce((a, b) => a + Number(b.total_amount), 0),
          passengers: relevant.reduce((a, b) => a + b.seat_count, 0)
        };
      });
      res.json(result);
    });
  });
};

exports.getDriverPerformance = (req, res) => {
  loadContext(req.user, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.driversbasic(req.user, (err2, drivers) => {
      if (err2) return res.status(500).send({ error: err2 });

      const schedIdsByDriver = {};
      ctx.schedules.forEach((s) => {
        schedIdsByDriver[s.driver_id] = schedIdsByDriver[s.driver_id] || [];
        schedIdsByDriver[s.driver_id].push(s.id);
      });

      const result = drivers.map((d) => {
        const schedIds = schedIdsByDriver[d.id] || [];
        const relevant = ctx.bookings.filter((b) => schedIds.includes(b.schedule_id) && b.status === 'Booked');
        return {
          driver: d.name,
          trips: schedIds.length,
          revenue: relevant.reduce((a, b) => a + Number(b.total_amount), 0),
          passengers: relevant.reduce((a, b) => a + b.seat_count, 0)
        };
      });
      res.json(result);
    });
  });
};

exports.getCashCollection = (req, res) => {
  loadContext(req.user, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.usersbasic(req.user, (err2, users) => {
      if (err2) return res.status(500).send({ error: err2 });

      const nameById = {};
      users.forEach((u) => { nameById[u.id] = u.name; });

      const byCounter = {};
      ctx.bookings.filter((b) => b.status === 'Booked').forEach((b) => {
        const name = nameById[b.counter_user_id] || `User ${b.counter_user_id}`;
        byCounter[name] = byCounter[name] || { tickets: 0, cash: 0 };
        byCounter[name].tickets += b.seat_count;
        byCounter[name].cash += Number(b.total_amount);
      });
      res.json(Object.entries(byCounter).map(([counter, v]) => ({ counter, ...v })));
    });
  });
};

exports.getTripHistory = (req, res) => {
  const dateScope = req.query.date_scope || 'today';
  const driverId = req.query.driver_id || null;
  const vehicleId = req.query.vehicle_id || null;
  if (!['today', 'all'].includes(dateScope)) {
    return res.status(400).send({ message: 'date_scope must be today or all' });
  }
  if ((driverId && !isPositiveId(driverId)) || (vehicleId && !isPositiveId(vehicleId))) {
    return res.status(400).send({ message: 'driver_id and vehicle_id must be positive integers' });
  }

  Report.getTripHistory({ dateScope, driverId, vehicleId }, (err, trips) => {
    if (err) return res.status(500).send({ error: err });
    const now = Date.now();
    res.json(trips.map((trip) => ({
      ...trip,
      trip_state: trip.status === 'Cancelled'
        ? 'Cancelled'
        : new Date(trip.departure_datetime).getTime() > now
          ? 'Planned'
          : new Date(trip.arrival_datetime).getTime() > now
            ? 'In progress'
            : 'Completed'
    })));
  });
};
