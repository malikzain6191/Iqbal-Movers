const db = require('../config/db');
const { driverScope } = require('../utils/accessScope');

exports.getalldrivers = (user, cb) => {
  const scope = driverScope(user, 'd');
  db.query(
    `SELECT d.*, home.name AS home_terminal_name
     FROM drivers d
     LEFT JOIN terminals home ON home.id = d.home_terminal_id
     WHERE ${scope.sql}`,
    scope.params,
    cb
  );
};

exports.getavailabilitydrivers = (user, originTerminalId, cb) => {
  if (user?.role !== 'city_admin') return exports.getalldrivers(user, cb);
  db.query(
    `SELECT DISTINCT d.*, home.name AS home_terminal_name
     FROM drivers d
     JOIN terminals origin ON origin.id = ?
     LEFT JOIN terminals home ON home.id = d.home_terminal_id
     WHERE d.city_id = origin.city_id OR home.city_id = origin.city_id
       OR EXISTS (
         SELECT 1 FROM schedules assigned
         JOIN terminals assigned_origin ON assigned_origin.id = assigned.departure_terminal_id
         JOIN terminals assigned_destination ON assigned_destination.id = assigned.arrival_terminal_id
         WHERE assigned.driver_id = d.id AND assigned.status <> 'Cancelled'
           AND (assigned_origin.city_id = origin.city_id OR assigned_destination.city_id = origin.city_id)
       )`,
    [originTerminalId],
    cb
  );
};

exports.getdriverbyID = (id, cb) => {
  db.query('SELECT * FROM drivers WHERE id = ?', [id], cb);
};

exports.createdriver = (d, cb) => {
  const { name, cnic, phone, city_id, home_terminal_id, address, license_number, license_expiry_date } = d;

  db.query(
    'SELECT id FROM drivers WHERE REPLACE(cnic, "-", "") = ? OR LOWER(license_number) = LOWER(?)',
    [String(cnic).replace(/\D/g, ''), license_number],
    (err, results) => {
    if (err) return cb(err);
    if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

    db.query(
      `INSERT INTO drivers (name, cnic, phone, city_id, home_terminal_id, address, license_number, license_expiry_date, status)
       VALUES (?,?,?,?,?,?,?,?,"Active")`,
      [name, cnic, phone || null, city_id, home_terminal_id, address || null, license_number, license_expiry_date],
      (err2, result2) => {
        if (err2) return cb(err2);
        cb(null, { success: true, insertedId: result2.insertId });
      }
    );
    }
  );
};

exports.toggledriverstatus = (id, user, cb) => {
  const scope = driverScope(user, 'd');
  db.query(`SELECT d.status FROM drivers d WHERE d.id = ? AND ${scope.sql}`, [id, ...scope.params], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) return cb(null, { success: false, reason: 'NOT_FOUND' });

    const newStatus = results[0].status === 'Active' ? 'Suspended' : 'Active';
    const updateScope = driverScope(user, 'scoped_driver');
    db.query(`UPDATE drivers SET status = ? WHERE id = ? AND EXISTS (
      SELECT 1 FROM (SELECT scoped_driver.id FROM drivers scoped_driver WHERE ${updateScope.sql}) scoped_driver
      WHERE scoped_driver.id = drivers.id
    )`, [newStatus, id, ...updateScope.params], (err2, result2) => {
      if (err2) return cb(err2);
      cb(null, { success: true, newStatus, affectedRows: result2.affectedRows });
    });
  });
};
