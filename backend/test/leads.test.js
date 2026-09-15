const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { boot, login, authHeader } = require('./helpers');

let ctx;
let token;

before(async () => {
  ctx = await boot();
  const { body } = await login(ctx.baseURL, 'admin@sunpeak.pk', 'admin123');
  token = body.token;
});

after(async () => {
  await ctx.close();
});

test('list seeded leads (10)', async () => {
  const res = await fetch(`${ctx.baseURL}/leads`, { headers: authHeader(token) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 10);
});

test('create lead with all fields', async () => {
  const res = await fetch(`${ctx.baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({
      customer_name: 'Tester A',
      customer_phone: '+92 300 1234567',
      customer_email: 'a@test.pk',
      customer_city: 'Lahore',
      monthly_consumption: 650,
      system_type: 'hybrid',
      budget_min: 1000000,
      budget_max: 2500000,
      roof_area: 150,
      battery_required: true,
      appliances: '2 AC, Fridge',
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.customer_name, 'Tester A');
  assert.equal(body.status, 'new');
  assert.equal(body.company_id, 'SunPeak'.length ? body.company_id : null);
  assert.ok(body.id);

  const act = await fetch(`${ctx.baseURL}/leads/${body.id}`, { headers: authHeader(token) });
  const actBody = await act.json();
  assert.ok(actBody.activities.length >= 1);
  assert.equal(actBody.activities[0].activity_type, 'created');
});

test('update lead changes status and logs activity', async () => {
  const created = await fetch(`${ctx.baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ customer_name: 'Tester B', customer_phone: '+92 311 0000000' }),
  }).then((r) => r.json());

  const res = await fetch(`${ctx.baseURL}/leads/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status: 'qualified', temperature: 'warm' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'qualified');
  assert.equal(body.temperature, 'warm');

  const detail = await fetch(`${ctx.baseURL}/leads/${created.id}`, { headers: authHeader(token) }).then((r) => r.json());
  assert.ok(detail.activities.some((a) => a.activity_type === 'status_changed'));
});

test('add activity to lead', async () => {
  const created = await fetch(`${ctx.baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ customer_name: 'Tester C', customer_phone: '+92 311 1111111' }),
  }).then((r) => r.json());

  const res = await fetch(`${ctx.baseURL}/leads/${created.id}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ activity_type: 'call', description: 'Called customer, discussed savings' }),
  });
  assert.equal(res.status, 201);

  const detail = await fetch(`${ctx.baseURL}/leads/${created.id}`, { headers: authHeader(token) }).then((r) => r.json());
  assert.ok(detail.activities.some((a) => a.activity_type === 'call'));
});

test('stats endpoint returns pipeline counts', async () => {
  const res = await fetch(`${ctx.baseURL}/leads/stats`, { headers: authHeader(token) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.by_status));
  assert.ok(Array.isArray(body.by_temperature));
  assert.ok(Array.isArray(body.by_assignee));
});

test('dashboard overview returns expected shape', async () => {
  const res = await fetch(`${ctx.baseURL.replace('/api', '')}/api/dashboard/overview`, {
    headers: authHeader(token),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.pipeline);
  assert.equal(typeof body.pipeline.new_leads, 'number');
  assert.ok(Array.isArray(body.recent_activity));
});

test('unknown lead returns 404', async () => {
  const res = await fetch(`${ctx.baseURL}/leads/does-not-exist`, { headers: authHeader(token) });
  assert.equal(res.status, 404);
});

test('cross-company lead is not visible', async () => {
  const reg = await fetch(`${ctx.baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: 'Second Co', name: 'Second', email: 'second@co.pk', password: 'secret123' }),
  }).then((r) => r.json());
  const otherToken = reg.token;

  const created = await fetch(`${ctx.baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(otherToken) },
    body: JSON.stringify({ customer_name: 'Hidden Lead', customer_phone: '+92 300 9999999' }),
  }).then((r) => r.json());
  assert.equal(created.customer_name, 'Hidden Lead');

  const mine = await fetch(`${ctx.baseURL}/leads/${created.id}`, { headers: authHeader(token) });
  assert.equal(mine.status, 404);

  const mineList = await fetch(`${ctx.baseURL}/leads`, { headers: authHeader(token) }).then((r) => r.json());
  assert.ok(!mineList.some((l) => l.id === created.id));
});

test('salesperson cannot access admin-only product create', async () => {
  const { body } = await login(ctx.baseURL, 'sales1@sunpeak.pk', 'sales123');
  const res = await fetch(`${ctx.baseURL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(body.token) },
    body: JSON.stringify({ name: 'Unauthorized Product', unit_price: 100 }),
  });
  assert.equal(res.status, 403);
});

test('salesperson cannot import products CSV', async () => {
  const { body } = await login(ctx.baseURL, 'sales1@sunpeak.pk', 'sales123');
  const fd = new FormData();
  fd.append('file', new Blob(['name,unit_price\nPanel,500\n'], { type: 'text/csv' }), 'p.csv');
  const res = await fetch(`${ctx.baseURL}/products/import`, {
    method: 'POST',
    headers: authHeader(body.token),
    body: fd,
  });
  assert.equal(res.status, 403);
});