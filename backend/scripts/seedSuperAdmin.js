// Solves the chicken-and-egg problem: creating a user requires being logged
// in as super_admin, but no user exists yet on a fresh database. Run this
// ONCE after you've executed the schema SQL and before starting the server.
//
//   npm run seed:admin
//
// Change the password immediately after your first real login.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const NAME = 'Super Admin';
const USERNAME = 'superadmin';
const PASSWORD = 'super123'; // CHANGE THIS after first login

bcrypt.hash(PASSWORD, 10, (err, hash) => {
  if (err) throw err;

  db.query('SELECT id FROM roles WHERE name = "super_admin"', (err2, roles) => {
    if (err2) throw err2;
    if (roles.length === 0) throw new Error('The super_admin role does not exist in the roles table');

    db.query('SELECT id FROM users WHERE username = ?', [USERNAME], (err3, results) => {
      if (err3) throw err3;
      if (results.length > 0) {
        console.log(`User "${USERNAME}" already exists — nothing to do.`);
        process.exit(0);
      }

      db.query(
        'INSERT INTO users (name, username, password_hash, role_id, status) VALUES (?,?,?,?,"Active")',
        [NAME, USERNAME, hash, roles[0].id],
        (err4, result) => {
          if (err4) throw err4;
          console.log(`Created super_admin user "${USERNAME}" (id ${result.insertId}) with password "${PASSWORD}".`);
          console.log('Log in and change this password immediately.');
          process.exit(0);
        }
      );
    });
  });
});
