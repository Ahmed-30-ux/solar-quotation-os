require('dotenv').config();
const { Pool, types } = require('pg');

// Postgres returns BIGINT (int8) and NUMERIC as strings by default to avoid
// precision loss. The app and its clients expect JS numbers, matching the
// previous SQLite behaviour.
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('FATAL: DATABASE_URL is not set. See backend/.env.example');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  options: process.env.PGOPTIONS || undefined,
});

module.exports = pool;
