const db = require('../config/db');

exports.getallterminal = (cityId, cb) => {
  if (cityId) {
    db.query('SELECT * FROM terminals WHERE city_id = ?', [cityId], cb);
  } else {
    db.query('SELECT * FROM terminals', cb);
  }
};

exports.getterminalbyID = (id, cb) => {
  db.query('SELECT * FROM terminals WHERE id = ?', [id], cb);
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

exports.updateterminal = (id, terminal, cb) => {
  const { name, address, phone, status } = terminal;
  db.query('SELECT city_id FROM terminals WHERE id = ?', [id], (err, rows) => {
    if (err) return cb(err);
    if (rows.length === 0) return cb(null, { success: true, affectedRows: 0 });

    db.query(
      'SELECT id FROM terminals WHERE city_id = ? AND LOWER(TRIM(name)) = LOWER(?) AND id != ?',
      [rows[0].city_id, name, id],
      (err2, duplicates) => {
        if (err2) return cb(err2);
        if (duplicates.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

        db.query(
          'UPDATE terminals SET name = ?, address = ?, phone = ?, status = ? WHERE id = ?',
          [name, address, phone, status, id],
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
