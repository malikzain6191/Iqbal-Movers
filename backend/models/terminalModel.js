const db = require('../config/db');
const { terminalScope } = require('../utils/accessScope');

exports.getallterminal = (user, requestedCityId, cb) => {
  const scope = terminalScope(user, 't');
  const cityFilter = requestedCityId ? ' AND t.city_id = ?' : '';
  const params = requestedCityId ? [...scope.params, requestedCityId] : scope.params;
  db.query(`SELECT t.* FROM terminals t WHERE ${scope.sql}${cityFilter}`, params, cb);
};

exports.getRouteDestinations = (cb) => {
  db.query(
    `SELECT t.id, t.name, t.city_id, c.name AS city_name
     FROM terminals t
     JOIN cities c ON c.id = t.city_id
     WHERE t.status = 'Active'
     ORDER BY c.name, t.name`,
    cb
  );
};

exports.getterminalbyID = (id, cb) => {
  db.query('SELECT * FROM terminals WHERE id = ?', [id], cb);
};

exports.getterminalbyIDInScope = (id, user, cb) => {
  const scope = terminalScope(user, 't');
  db.query(`SELECT t.* FROM terminals t WHERE t.id = ? AND ${scope.sql}`, [id, ...scope.params], cb);
};

exports.createterminal = (terminal, cb) => {
  const { name, city_id, address, phone } = terminal;

  db.query('SELECT id FROM terminals WHERE city_id = ? AND LOWER(TRIM(name)) = LOWER(?)', [city_id, name], (err, results) => {
    if (err) return cb(err);
    if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

    db.query(
      'INSERT INTO terminals (city_id, name, address, phone, status) VALUES (?,?,?,?,"Active")',
      [city_id, name, address, phone],
      (err2, result2) => {
        if (err2) return cb(err2);
        cb(null, { success: true, insertedId: result2.insertId });
      }
    );
  });
};

exports.updateterminal = (id, terminal, user, cb) => {
  const { name, address, phone, status } = terminal;
  const scope = terminalScope(user, 't');
  db.query(`SELECT t.city_id FROM terminals t WHERE t.id = ? AND ${scope.sql}`, [id, ...scope.params], (err, rows) => {
    if (err) return cb(err);
    if (rows.length === 0) return cb(null, { success: true, affectedRows: 0 });

    db.query(
      'SELECT id FROM terminals WHERE city_id = ? AND LOWER(TRIM(name)) = LOWER(?) AND id != ?',
      [rows[0].city_id, name, id],
      (err2, duplicates) => {
        if (err2) return cb(err2);
        if (duplicates.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

        db.query(
          `UPDATE terminals t SET name = ?, address = ?, phone = ?, status = ?
           WHERE t.id = ? AND ${scope.sql}`,
          [name, address, phone, status, id, ...scope.params],
          (err3, result) => {
            if (err3) return cb(err3);
            cb(null, { success: true, affectedRows: result.affectedRows });
          }
        );
      }
    );
  });
};

exports.deleteterminal = (id, cb) => {
  db.query(
    'SELECT id FROM routes WHERE origin_terminal_id = ? OR destination_terminal_id = ?',
    [id, id],
    (err, results) => {
      if (err) return cb(err);
      if (results.length > 0) return cb(null, { success: false, reason: 'IN_USE' });

      db.query(
        'SELECT id FROM schedules WHERE departure_terminal_id = ? OR arrival_terminal_id = ?',
        [id, id],
        (err2, results2) => {
          if (err2) return cb(err2);
          if (results2.length > 0) return cb(null, { success: false, reason: 'IN_USE' });

          db.query('DELETE FROM terminals WHERE id = ?', [id], (err3, result3) => {
            if (err3) return cb(err3);
            cb(null, { success: true, affectedRows: result3.affectedRows });
          });
        }
      );
    }
  );
};
