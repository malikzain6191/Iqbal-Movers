const db = require('../config/db');

// Fire-and-forget: a failed audit write must never break the actual
// business operation it's logging, so errors here are only console.error'd,
// never thrown or passed to the caller.
exports.logAudit = (userId, userName, actionType, entityName, entityId, detail) => {
  db.query(
    'INSERT INTO audit_logs (user_id, action_type, entity_name, entity_id, new_value, created_at) VALUES (?,?,?,?,?,NOW())',
    [userId, actionType, entityName, entityId, JSON.stringify({ detail, by: userName })],
    (err) => {
      if (err) console.error('Audit log write failed:', err.message);
    }
  );
};
