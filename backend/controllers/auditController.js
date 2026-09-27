const Audit = require('../models/auditModel');

exports.getAuditLogs = (req, res) => {
  Audit.listlogs((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};
