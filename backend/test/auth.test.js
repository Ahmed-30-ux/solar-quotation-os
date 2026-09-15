const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { boot, login, authHeader } = require('./helpers');

let ctx;
let adminToken;

before(async () => {
  ctx = await boot();
  const { body } = await login(ctx.baseURL, 'admin@sunpeak.pk', 'admin123');
  adminToken = body.token;
});

after(async () => {
  await ctx.close();
});

test('health endpoint responds', async () => {
  const res = await fetch(`${ctx.baseURL.replace('/api', '')}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('register creates company with defaults', async () => {
  const res = await fetch(`${ctx.baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: 'Test Co',
      name: 'Test Admin',
      email: 'test@example.com',
      phone: '+92 300 1111111',
      password: 'secret123',
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.token);
  assert.equal(body.user.role, 'admin');
  assert.ok(body.user.company_id);

  const categories = await fetch(`${ctx.baseURL}/products/categories`, {
    headers: authHeader(body.token),
  });
  const catBody = await categories.json();
  const arr = Array.isArray(catBody) ? catBody : catBody.rows;
  assert.ok(arr.length >= 5, `expected >=5 default categories, got ${arr.length}`);
});

test('register rejects duplicate email', async () => {
  const res = await fetch(`${ctx.baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: 'Dup Co',
      name: 'Dup',
      email: 'test@example.com',
      password: 'secret123',
    }),
  });
  assert.equal(res.status, 409);
});

test('login rejects wrong password', async () => {
  const { res } = await login(ctx.baseURL, 'admin@sunpeak.pk', 'wrongpass');
  assert.equal(res.status, 401);
});

test('login rejects unknown email', async () => {
  const { res } = await login(ctx.baseURL, 'nobody@nowhere.pk', 'x');
  assert.equal(res.status, 401);
});

test('admin login succeeds and getMe returns profile', async () => {
  const { res, body } = await login(ctx.baseURL, 'admin@sunpeak.pk', 'admin123');
  assert.equal(res.status, 200);
  assert.ok(body.token);
  assert.equal(body.user.role, 'admin');

  const me = await fetch(`${ctx.baseURL}/auth/me`, {
    headers: authHeader(body.token),
  });
  assert.equal(me.status, 200);
  const meBody = await me.json();
  assert.equal(meBody.email, 'admin@sunpeak.pk');
});

test('missing/invalid token rejected', async () => {
  const res = await fetch(`${ctx.baseURL}/leads`);
  assert.equal(res.status, 401);

  const res2 = await fetch(`${ctx.baseURL}/leads`, {
    headers: authHeader('garbage.token.here'),
  });
  assert.equal(res2.status, 401);
});

test('salesperson can login but is not admin', async () => {
  const { res, body } = await login(ctx.baseURL, 'sales1@sunpeak.pk', 'sales123');
  assert.equal(res.status, 200);
  assert.equal(body.user.role, 'salesperson');
});