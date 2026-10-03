const db = require('../config/db');
const { routeScope } = require('../utils/accessScope');

exports.getallroutes = (user, cb) => {
  const scope = routeScope(user, 'r');
  db.query(`SELECT r.* FROM routes r WHERE ${scope.sql}`, scope.params, cb);
};

exports.getroutebyID = (id, cb) => {
  db.query('SELECT * FROM routes WHERE id = ?', [id], cb);
};

exports.getroutebyIDInScope = (id, user, cb) => {
  const scope = routeScope(user, 'r');
  db.query(
    `SELECT r.*, origin.name AS origin_terminal_name, destination.name AS destination_terminal_name
     FROM routes r
     JOIN terminals origin ON origin.id = r.origin_terminal_id
     JOIN terminals destination ON destination.id = r.destination_terminal_id
     WHERE r.id = ? AND ${scope.sql}`,
    [id, ...scope.params],
    cb
  );
};

exports.updateroutemetrics = (id, { distance_km, estimated_duration_minutes }, cb) => {
  db.query(
    'UPDATE routes SET distance_km = ?, estimated_duration_minutes = ? WHERE id = ?',
    [distance_km, estimated_duration_minutes, id],
    cb
  );
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
          if (err2?.code === 'ER_DUP_ENTRY') {
            return cb(null, { success: false, reason: 'DUPLICATE' });
          }
          if (err2) return cb(err2);
          cb(null, { success: true, insertedId: result2.insertId });
        }
      );
    }
  );
};
