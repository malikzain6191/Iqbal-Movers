const db = require('../config/db');

exports.getallroutes = (cb) => {
  db.query('SELECT * FROM routes', cb);
};

exports.getroutebyID = (id, cb) => {
  db.query('SELECT * FROM routes WHERE id = ?', [id], cb);
};

exports.createroute = (r, cb) => {
  const { name, origin_terminal_id, destination_terminal_id, distance_km, estimated_duration_minutes } = r;

  if (String(origin_terminal_id) === String(destination_terminal_id)) {
    return cb(null, { success: false, reason: 'SAME_TERMINAL' });
  }

  db.query(
    'SELECT id FROM routes WHERE origin_terminal_id = ? AND destination_terminal_id = ?',
    [origin_terminal_id, destination_terminal_id],
    (err, results) => {
      if (err) return cb(err);
      if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

      db.query(
        `INSERT INTO routes (name, origin_terminal_id, destination_terminal_id, distance_km, estimated_duration_minutes, status)
         VALUES (?,?,?,?,?,"Active")`,
        [name, origin_terminal_id, destination_terminal_id, distance_km || null, estimated_duration_minutes || null],
        (err2, result2) => {
          if (err2) return cb(err2);
          cb(null, { success: true, insertedId: result2.insertId });
        }
      );
    }
  );
};
