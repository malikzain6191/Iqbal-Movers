const db = require('../config/db');

exports.listlogs = (cb) => {
  db.query(
    `SELECT al.*, u.name AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 200`,
    cb
  );
};
