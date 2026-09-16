require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run tests. See backend/.env.example');
}

const sslConfig = process.env.DATABASE_SSL === 'false'
  ? false
  : { rejectUnauthorized: false };

async function boot() {
  const schema = 'sqos_test_' + crypto.randomBytes(4).toString('hex');

  // Create the isolated schema first (using the default search_path), since a
  // search_path pointing at a nonexistent schema leaves no creation target.
  const setup = new Pool({ connectionString, ssl: sslConfig, max: 1 });
  await setup.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await setup.end();

  // Each test run gets an isolated schema via the pool's startup options.
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';

  const { migrate } = require('../src/config/migrate');
  const { seed } = require('../src/config/seed');
  await migrate();
  await seed();

  const db = require('../src/config/db');
  const app = require('../src/server');

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const baseURL = `http://127.0.0.1:${port}/api`;

  return {
    baseURL,
    db,
    server,
    async close() {
      server.close();
      await new Promise((resolve) => server.close(resolve));
      await db.end().catch(() => {});
      const cleanup = new Pool({ connectionString, ssl: sslConfig, max: 1 });
      await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
      await cleanup.end().catch(() => {});
    },
  };
}

async function login(baseURL, email, password) {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { res, body };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { boot, login, authHeader };