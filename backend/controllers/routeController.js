const Route = require('../models/routeModel');
const Terminal = require('../models/terminalModel');
const { logAudit } = require('../utils/audit');
const { isOptionalPositiveInteger, isOptionalPositiveNumber, isPositiveId } = require('../utils/validation');

exports.getAllRoutes = (req, res) => {
  Route.getallroutes((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.createRoute = (req, res) => {
  const { origin_terminal_id, destination_terminal_id, distance_km, estimated_duration_minutes } = req.body;
  if (!isPositiveId(origin_terminal_id) || !isPositiveId(destination_terminal_id)) {
    return res.status(400).send({ message: 'origin_terminal_id and destination_terminal_id are required' });
  }
  if (!isOptionalPositiveNumber(distance_km) || !isOptionalPositiveInteger(estimated_duration_minutes)) {
    return res.status(400).send({ message: 'Distance and duration must be positive numbers when provided' });
  }

  // Name is built server-side from real terminal rows — never trust a
  // client-supplied display name for this.
  Terminal.getterminalbyID(origin_terminal_id, (err, originResults) => {
    if (err) return res.status(500).send({ error: err });
    Terminal.getterminalbyID(destination_terminal_id, (err2, destResults) => {
      if (err2) return res.status(500).send({ error: err2 });

      const origin = originResults[0];
      const dest = destResults[0];
      if (!origin || !dest) return res.status(400).send({ message: 'Invalid origin_terminal_id or destination_terminal_id' });

      const name = `${origin.name} → ${dest.name}`;
      Route.createroute({ name, origin_terminal_id, destination_terminal_id, distance_km, estimated_duration_minutes }, (err3, result) => {
        if (err3) return res.status(500).send({ error: err3 });
        if (!result.success && result.reason === 'SAME_TERMINAL') {
          return res.status(400).send({ message: 'Origin and destination must differ' });
        }
        if (!result.success && result.reason === 'DUPLICATE') {
          return res.status(400).send({ message: 'This route already exists' });
        }
        logAudit(req.user.id, req.user.name, 'Route Creation', 'Route', result.insertedId, name);
        res.status(201).send({ message: 'Route created successfully', routeId: result.insertedId });
      });
    });
  });
};
