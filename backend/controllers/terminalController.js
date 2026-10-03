const Terminal = require('../models/terminalModel');
const { logAudit } = require('../utils/audit');
const { isPhone, isPositiveId, isTerminalName, normalizeText } = require('../utils/validation');

exports.getAllTerminal = (req, res) => {
  Terminal.getallterminal(req.user, req.query.city_id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.getRouteDestinations = (req, res) => {
  Terminal.getRouteDestinations((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.getTerminalByID = (req, res) => {
  Terminal.getterminalbyIDInScope(req.params.id, req.user, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    if (results.length === 0) return res.status(404).send({ message: 'Terminal not found' });

    const terminal = results[0];
    res.json(terminal);
  });
};

exports.createTerminal = (req, res) => {
  const cityId = req.user.role === 'super_admin' ? req.body.city_id : req.user.city_id;
  const name = normalizeText(req.body.name);
  const phone = String(req.body.phone || '').trim();
  if (!isTerminalName(name) || !isPositiveId(cityId)) return res.status(400).send({ message: 'A valid terminal name and city_id are required' });
  if (!isPhone(phone)) return res.status(400).send({ message: 'Enter a valid terminal phone number' });

  Terminal.createterminal({ ...req.body, name, phone: phone || null, city_id: cityId }, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success && result.reason === 'DUPLICATE') {
      return res.status(400).send({ message: 'A terminal with this name already exists in this city' });
    }
    logAudit(req.user.id, req.user.name, 'Terminal Creation', 'Terminal', result.insertedId, req.body.name);
    res.status(201).send({ message: 'Terminal created successfully', terminalId: result.insertedId });
  });
};

exports.updateTerminal = (req, res) => {
  const name = normalizeText(req.body.name);
  const phone = String(req.body.phone || '').trim();
  if (!isTerminalName(name)) return res.status(400).send({ message: 'Terminal name contains invalid characters' });
  if (!isPhone(phone)) return res.status(400).send({ message: 'Enter a valid terminal phone number' });

  Terminal.updateterminal(req.params.id, { ...req.body, name, phone: phone || null }, req.user, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success && result.reason === 'DUPLICATE') return res.status(409).send({ message: 'A terminal with this name already exists in this city' });
    if (result.affectedRows === 0) return res.status(404).send({ message: 'Terminal not found' });
    logAudit(req.user.id, req.user.name, 'Terminal Update', 'Terminal', req.params.id, JSON.stringify(req.body));
    res.send({ message: 'Terminal updated successfully' });
  });
};

exports.deleteTerminal = (req, res) => {
  Terminal.deleteterminal(req.params.id, (err, result) => {
    if (err) return res.status(500).send({ error: err });
    if (!result.success) {
      if (result.reason === 'IN_USE') {
        return res.status(400).send({ message: "Terminal can't be deleted — routes or schedules reference it" });
      }
      return res.status(400).send({ message: 'Unknown deletion error' });
    }
    logAudit(req.user.id, req.user.name, 'Terminal Deletion', 'Terminal', req.params.id, '');
    res.send({ message: 'Terminal deleted successfully' });
  });
};
