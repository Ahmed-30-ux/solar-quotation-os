const os = require('os');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH;

async function boot() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solar-os-test-'));
  process.env.DB_PATH = path.join(tmpDir, 'test.db');
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
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
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