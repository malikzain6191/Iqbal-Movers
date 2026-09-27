const Report = require('../models/reportModel');

function loadContext(counterUserId, cb) {
  Report.rawbookings(counterUserId, (err, bookings) => {
    if (err) return cb(err);
    Report.schedulesbasic((err2, schedules) => {
      if (err2) return cb(err2);
      Report.seatcountsbyschedule((err3, seatCounts) => {
        if (err3) return cb(err3);
        cb(null, { bookings, schedules, seatCounts });
      });
    });
  });
}

exports.getTodayDashboard = (req, res) => {
  Report.todaystats((err, statsRows) => {
    if (err) return res.status(500).send({ error: err });
    Report.upcomingdepartures((err2, upcoming) => {
      if (err2) return res.status(500).send({ error: err2 });
      res.json({ ...statsRows[0], upcoming });
      // NOTE: occupancy_pct is left out here deliberately — it needs total
      // seat capacity for today's trips, which is one more join away. Add
      // it once you also need it, rather than computing it unused.
    });
  });
};

exports.getDailySales = (req, res) => {
  const counterFilter = req.user.role === 'counter_operator' ? req.user.id : null;
  loadContext(counterFilter, (err, ctx) => {
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
  loadContext(null, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.routesbasic((err2, routes) => {
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
  loadContext(null, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.vehiclesbasic((err2, vehicles) => {
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
          vehicle: v.vehicle_number,
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
  loadContext(null, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.driversbasic((err2, drivers) => {
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
  const counterFilter = req.user.role === 'counter_operator' ? req.user.id : null;
  loadContext(counterFilter, (err, ctx) => {
    if (err) return res.status(500).send({ error: err });
    Report.usersbasic((err2, users) => {
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
