const db = require('../config/db');
const { cityScope } = require('../utils/accessScope');

exports.getallcity = (user, cb) => {
  const scope = cityScope(user, 'c');
  db.query(`SELECT c.* FROM cities c WHERE ${scope.sql}`, scope.params, cb);
};

exports.getcitybyID = (id, user, cb) => {
  const scope = cityScope(user, 'c');
  db.query(`SELECT c.* FROM cities c WHERE c.id = ? AND ${scope.sql}`, [id, ...scope.params], cb);
};

exports.createcity = (city, cb) => {
  const { name } = city;

  db.query('SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(?)', [name], (err, results) => {
    if (err) return cb(err);

    if (results.length > 0) {
      return cb(null, { success: false, reason: 'DUPLICATE' });
    }

    db.query('INSERT INTO cities (name, status) VALUES (?, "Active")', [name], (err2, result2) => {
      if (err2) return cb(err2);
      cb(null, { success: true, result: result2, insertedId: result2.insertId });
    });
  });
};

exports.updatecity = (id, city, cb) => {
  const { name, status } = city;

  db.query('SELECT id FROM cities WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?', [name, id], (err, results) => {
    if (err) return cb(err);

    if (results.length > 0) {
      return cb(null, { success: false, reason: 'DUPLICATE' });
    }

    db.query('UPDATE cities SET name = ?, status = ? WHERE id = ?', [name, status, id], (err2, result2) => {
      if (err2) return cb(err2);
      cb(null, { success: true, result: result2, affectedRows: result2.affectedRows });
    });
  });
};

exports.deletecity = (id, cb) => {
  // FIX: your original sample checked a `customer` table here, which doesn't
  // exist in this project. A city's real dependency is its terminals.
  db.query('SELECT id FROM terminals WHERE city_id = ?', [id], (err, results) => {
    if (err) return cb(err);

    if (results.length === 0) {
      db.query('DELETE FROM cities WHERE id = ?', [id], (err2, result2) => {
        if (err2) return cb(err2);
        cb(null, { success: true, affectedRows: result2.affectedRows });
      });
    } else {
      cb(null, { success: false, reason: 'IN_USE' });
    }
  });
};
