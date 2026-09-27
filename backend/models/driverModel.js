const db = require('../config/db');

exports.getalldrivers = (cityId, cb) => {
  if (cityId) {
    db.query('SELECT * FROM drivers WHERE city_id = ?', [cityId], cb);
  } else {
    db.query('SELECT * FROM drivers', cb);
  }
};

exports.getdriverbyID = (id, cb) => {
  db.query('SELECT * FROM drivers WHERE id = ?', [id], cb);
};

exports.createdriver = (d, cb) => {
  const { name, cnic, phone, city_id, address, license_number, license_expiry_date } = d;

  db.query(
    'SELECT id FROM drivers WHERE REPLACE(cnic, "-", "") = ? OR LOWER(license_number) = LOWER(?)',
    [String(cnic).replace(/\D/g, ''), license_number],
    (err, results) => {
    if (err) return cb(err);
    if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

    db.query(
      `INSERT INTO drivers (name, cnic, phone, city_id, address, license_number, license_expiry_date, status)
       VALUES (?,?,?,?,?,?,?,"Active")`,
      [name, cnic, phone || null, city_id, address || null, license_number, license_expiry_date],
      (err2, result2) => {
        if (err2) return cb(err2);
        cb(null, { success: true, insertedId: result2.insertId });
      }
    );
    }
  );
};

exports.toggledriverstatus = (id, cb) => {
  db.query('SELECT status FROM drivers WHERE id = ?', [id], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) return cb(null, { success: false, reason: 'NOT_FOUND' });

    const newStatus = results[0].status === 'Active' ? 'Suspended' : 'Active';
    db.query('UPDATE drivers SET status = ? WHERE id = ?', [newStatus, id], (err2, result2) => {
      if (err2) return cb(err2);
      cb(null, { success: true, newStatus, affectedRows: result2.affectedRows });
    });
  });
};
