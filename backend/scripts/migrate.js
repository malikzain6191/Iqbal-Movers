require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const database = process.env.DB_NAME || 'iqbal_travels_tms';

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
}

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
}).promise();

async function migrate() {
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database });
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => /^\d+.*\.sql$/i.test(file))
      .sort();

    for (const file of files) {
      const [applied] = await connection.query(
        'SELECT name FROM schema_migrations WHERE name = ?',
        [file]
      );
      if (applied.length) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`Applied: ${file}`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
});
