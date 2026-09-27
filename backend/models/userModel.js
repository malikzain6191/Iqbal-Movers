const db = require('../config/db');

exports.getallusers = (cb) => {
  db.query(
    `SELECT u.id, u.name, u.username, u.phone, r.name AS role, u.city_id, u.terminal_id, u.status, u.created_at
     FROM users u JOIN roles r ON r.id = u.role_id`,
    cb
  );
};

exports.finduserbyusername = (username, cb) => {
  db.query(
    `SELECT u.*, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = ?`,
    [username],
    cb
  );
};

exports.createuser = (user, cb) => {
  const { name, username, password_hash, phone, role, city_id, terminal_id } = user;

  db.query('SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?)', [username], (err, results) => {
    if (err) return cb(err);
    if (results.length > 0) return cb(null, { success: false, reason: 'DUPLICATE' });

    db.query('SELECT id FROM roles WHERE name = ?', [role], (err2, roles) => {
      if (err2) return cb(err2);
      if (roles.length === 0) return cb(new Error(`Role "${role}" was not found`));

      db.query(
        `INSERT INTO users (name, username, password_hash, phone, role_id, city_id, terminal_id, status)
         VALUES (?,?,?,?,?,?,?,"Active")`,
        [name, username, password_hash, phone || null, roles[0].id, city_id || null, terminal_id || null],
        (err3, result) => {
          if (err3) return cb(err3);
          cb(null, { success: true, insertedId: result.insertId });
        }
      );
    });
  });
};

exports.toggleuserstatus = (id, cb) => {
  db.query('SELECT status FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) return cb(null, { success: false, reason: 'NOT_FOUND' });

    const newStatus = results[0].status === 'Active' ? 'Inactive' : 'Active';
    db.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id], (err2, result2) => {
      if (err2) return cb(err2);
      cb(null, { success: true, newStatus, affectedRows: result2.affectedRows });
    });
  });
};
