const mysql = require('mysql2');

// Callback-style pool — matches the db.query(sql, params, cb) style used
// throughout models/. bookingModel.js additionally wraps this same pool
// with pool.promise() for its transactional functions only.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
