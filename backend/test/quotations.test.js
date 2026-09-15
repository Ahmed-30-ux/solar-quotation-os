const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { boot, login, authHeader } = require('./helpers');

let ctx;
let token;

async function createLead(name) {
  const res = await fetch(`${ctx.baseURL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ customer_name: name, customer_phone: '+92 300 0000111', monthly_consumption: 500 }),
  });
  return (await res.json()).id;
}

before(async () => {
  ctx = await boot();
  const { body } = await login(ctx.baseURL, 'admin@sunpeak.pk', 'admin123');
  token = body.token;
});

after(async () => {
  await ctx.close();
});

test('generate quotation for a lead', async () => {
  const leadId = await createLead('Quote Tester 1');
  const res = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: true }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  const q = body.quotation || body;
  assert.ok(q.id);
  assert.ok(q.reference_number.startsWith('QT-'));
  assert.ok(q.system_size_kw > 0);
  assert.ok(q.total > 0);
  assert.ok(q.monthly_savings > 0);
  assert.ok(Array.isArray(q.items) && q.items.length > 0);
  assert.ok(q.equipment_subtotal > 0);
  assert.ok(q.tax_amount > 0);
});

test('quotation reference numbers increment', async () => {
  const leadId = await createLead('Quote Tester 2');
  const gen = async () => {
    const r = await fetch(`${ctx.baseURL}/quotations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: false }),
    });
    const b = await r.json();
    return (b.quotation || b).reference_number;
  };
  const ref1 = await gen();
  const ref2 = await gen();
  const num1 = parseInt(ref1.split('-')[2], 10);
  const num2 = parseInt(ref2.split('-')[2], 10);
  assert.equal(num2, num1 + 1);
});

test('quotation updates lead status to quoted', async () => {
  const leadId = await createLead('Quote Tester 3');
  const res = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: true }),
  });
  const body = await res.json();
  const q = body.quotation || body;

  const lead = await fetch(`${ctx.baseURL}/leads/${leadId}`, { headers: authHeader(token) }).then((r) => r.json());
  assert.equal(lead.status, 'quoted');
  assert.equal(lead.quotation_id, q.id);
  assert.ok(lead.quotation_amount > 0);
});

test('download quotation PDF', async () => {
  const leadId = await createLead('Quote Tester 4');
  const genRes = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: true }),
  });
  const q = (await genRes.json()).quotation;

  const pdfRes = await fetch(`${ctx.baseURL}/quotations/${q.id}/pdf`, { headers: authHeader(token) });
  assert.equal(pdfRes.status, 200);
  const ct = pdfRes.headers.get('content-type') || '';
  assert.ok(ct.includes('application/pdf') || ct.includes('application/octet-stream'), `got ${ct}`);
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  assert.ok(buf.length > 1000);
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
});

test('update quotation status', async () => {
  const leadId = await createLead('Quote Tester 5');
  const genRes = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: false }),
  });
  const q = (await genRes.json()).quotation;

  const up = await fetch(`${ctx.baseURL}/quotations/${q.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ status: 'accepted' }),
  });
  assert.equal(up.status, 200);
  const body = await up.json();
  assert.equal(body.status, 'accepted');
});

test('quotation not found for wrong company', async () => {
  const leadId = await createLead('Quote Tester 6');
  const genRes = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: leadId, system_type: 'hybrid', battery_required: false }),
  });
  const q = (await genRes.json()).quotation;

  const reg = await fetch(`${ctx.baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: 'Other Co', name: 'Other', email: 'other@co.pk', password: 'secret123' }),
  }).then((r) => r.json());

  const res = await fetch(`${ctx.baseURL}/quotations/${q.id}`, { headers: authHeader(reg.token) });
  assert.equal(res.status, 404);

  const pdfRes = await fetch(`${ctx.baseURL}/quotations/${q.id}/pdf`, { headers: authHeader(reg.token) });
  assert.equal(pdfRes.status, 404);
});

test('generate fails for nonexistent lead', async () => {
  const res = await fetch(`${ctx.baseURL}/quotations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ lead_id: 'does-not-exist', system_type: 'hybrid', battery_required: false }),
  });
  assert.equal(res.status, 404);
});