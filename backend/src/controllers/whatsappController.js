const pool = require('../config/db');
const { sendMessage, downloadMedia } = require('../services/whatsappService');
const quotationController = require('./quotationController');

const CONVERSATION_STAGES = [
  'greeting',
  'ask_bill',
  'bill_received',
  'ask_consumption',
  'ask_location',
  'ask_roof',
  'ask_budget',
  'ask_system_type',
  'ask_battery',
  'ask_appliances',
  'ask_panel_pref',
  'ask_inverter_pref',
  'qualifying',
  'generating_quote',
  'quote_delivered',
  'asking_next'
];

const STAGE_PROMPTS = {
  greeting: "Assalam o Alaikum! Welcome to [Company Name]. I'll help you find the perfect solar solution for your home. First, could you share your latest electricity bill? You can upload a photo or PDF. Or if you don't have a bill handy, just type your average monthly bill amount.",
  ask_bill: "No problem! Could you share your latest electricity bill? A photo or PDF works best. This helps us understand your exact consumption.",
  ask_consumption: "Got it. How many units (kWh) do you consume per month on average? You can check this on your bill.",
  ask_location: "Where is your property located? (City name)",
  ask_roof: "What is your available roof area? (Approximate square feet, e.g. 1000, 1500, 2000)",
  ask_budget: "What is your budget range?\n\n1) Under Rs 500,000\n2) Rs 500K - 1M\n3) Rs 1M - 2M\n4) Rs 2M+\n5) Not sure yet",
  ask_system_type: "What type of solar system do you prefer?\n\n1) On-Grid (no battery, lower cost)\n2) Hybrid (with battery backup)\n3) Off-Grid (full battery backup)\n4) Not sure — recommend for me",
  ask_battery: "Do you want battery backup?\n\n1) Yes, full backup\n2) Yes, partial (essential loads only)\n3) No backup needed",
  ask_appliances: "What major appliances do you run in your home? (e.g. 2 AC, fridge, washer, water pump, etc.)",
  ask_panel_pref: "Any solar panel brand preference?\n\n1) No preference\n2) JA Solar\n3) Canadian Solar\n4) Jinko\n5) LONGi\n6) Other (type the brand)",
  ask_inverter_pref: "Any inverter brand preference?\n\n1) No preference\n2) Growatt\n3) Huawei\n4) Sungrow\n5) Other (type the brand)",
  generating_quote: "Thank you! I'm preparing your personalized solar quotation. This will take just a moment...",
  quote_delivered: "Your quotation has been delivered! What would you like to do next?\n\n1) Talk to sales team\n2) Schedule a site visit\n3) Ask questions\n4) Request a revised quotation",
  asking_next: "Is there anything else I can help you with?"
};

exports.verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

exports.handleMessage = async (req, res) => {
  try {
    const body = req.body;
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages') {
          const message = change.value.messages && change.value.messages[0];
          if (!message) continue;

          const phoneNumber = message.from;
          const messageType = message.type;

          // Get or create WhatsApp session
          let sessionResult = await pool.query(
            'SELECT * FROM whatsapp_sessions WHERE phone_number = $1',
            [phoneNumber]
          );

          let session = sessionResult.rows[0];
          let lead = null;

          if (!session) {
            // Find company by matching phone number (simplified - in production use custom map)
            const companyResult = await pool.query(
              'SELECT id FROM companies LIMIT 1'
            );
            const companyId = companyResult.rows[0]?.id;
            if (!companyId) continue;

            const sessionResult2 = await pool.query(
              'INSERT INTO whatsapp_sessions (phone_number, company_id) VALUES ($1, $2) RETURNING *',
              [phoneNumber, companyId]
            );
            session = sessionResult2.rows[0];

            // Create lead
            const leadResult = await pool.query(
              'INSERT INTO leads (company_id, customer_phone, lead_source, status) VALUES ($1, $2, $3, $4) RETURNING *',
              [companyId, phoneNumber, 'whatsapp', 'new']
            );
            lead = leadResult.rows[0];

            await pool.query(
              'UPDATE whatsapp_sessions SET lead_id = $1 WHERE id = $2',
              [lead.id, session.id]
            );
          } else {
            lead = await pool.query('SELECT * FROM leads WHERE id = $1', [session.lead_id]);
            lead = lead.rows[0];
          }

          const stage = session.conversation_state || 'greeting';
          let context = session.context || {};

          // Handle media (bill upload)
          if (messageType === 'image' || messageType === 'document') {
            await handleBillUpload(message, lead, session, context);
            continue;
          } else if (messageType === 'text') {
            const text = normalizeText(message.text.body);
            await processText(phoneNumber, text, stage, context, lead, session);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('WhatsApp message error:', err);
    res.sendStatus(200);
  }
};

async function processText(phoneNumber, text, stage, context, lead, session) {
  switch (stage) {
    case 'greeting':
    case 'ask_bill':
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_bill.replace('[Company Name]', 'Solar Solutions'));
      await updateSession(session.id, text, { ...context, intent: parseIntent(text) });
      break;

    case 'ask_consumption': {
      if (text === 'skip') {
        await sendMessage(phoneNumber, STAGE_PROMPTS.ask_location);
        await updateSession(session.id, 'skip', {});
      } else {
        const consumption = parseNumber(text);
        if (!consumption) {
          await sendMessage(phoneNumber, "That doesn't look like a valid number. Please enter units in kWh (e.g. 500, 650, 800).");
          break;
        }
        await updateLead(lead.id, { monthly_consumption: consumption });
        await logActivity(lead.id, 'consumption_received', `Monthly consumption: ${consumption} kWh`);
        await sendMessage(phoneNumber, STAGE_PROMPTS.ask_location);
        await updateSession(session.id, 'location', {});
      }
      break;
    }

    case 'location': {
      await updateLead(lead.id, { customer_city: text });
      await logActivity(lead.id, 'location_received', `Location: ${text}`);
      // Set company name in greeting
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_roof);
      await updateSession(session.id, 'roof', {});
      break;
    }

    case 'roof': {
      const roof = parseNumber(text);
      if (!roof) {
        await sendMessage(phoneNumber, "Please enter the approximate roof area in square feet (e.g. 1000, 1500).");
        break;
      }
      await updateLead(lead.id, { roof_area: roof });
      await logActivity(lead.id, 'roof_area_received', `Roof area: ${roof} sq ft`);
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_budget);
      await updateSession(session.id, 'budget', {});
      break;
    }

    case 'budget': {
      const budgetMap = { 1: [0, 500000], 2: [500000, 1000000], 3: [1000000, 2000000], 4: [2000000, 5000000], 5: [null, null] };
      const budget = budgetMap[parseNumber(text)];
      if (!budget) {
        await sendMessage(phoneNumber, "Please select an option (1-5).");
        break;
      }
      await updateLead(lead.id, { budget_min: budget[0], budget_max: budget[1] });
      await logActivity(lead.id, 'budget_received', `Budget: ${budget[0]} - ${budget[1]}`);
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_system_type);
      await updateSession(session.id, 'system_type', {});
      break;
    }

    case 'system_type': {
      const typeMap = { 1: 'on_grid', 2: 'hybrid', 3: 'off_grid', 4: 'hybrid' };
      const systemType = typeMap[parseNumber(text)] || text;
      const valid = ['on_grid', 'hybrid', 'off_grid'].includes(systemType);
      if (!valid) {
        await sendMessage(phoneNumber, "Please select an option (1-4).");
        break;
      }
      await updateLead(lead.id, { system_type: systemType });
      await logActivity(lead.id, 'system_type_received', `System type: ${systemType}`);
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_battery);
      await updateSession(session.id, 'battery', {});
      break;
    }

    case 'battery': {
      const batteryMap = { 1: true, 2: true, 3: false };
      const battery = batteryMap[parseNumber(text)];
      if (battery === undefined) {
        await sendMessage(phoneNumber, "Please select an option (1-3).");
        break;
      }
      await updateLead(lead.id, { battery_required: battery });
      await logActivity(lead.id, 'battery_received', `Battery backup: ${battery ? 'Yes' : 'No'}`);
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_appliances);
      await updateSession(session.id, 'appliances', {});
      break;
    }

    case 'appliances': {
      await updateLead(lead.id, { appliances: text });
      await logActivity(lead.id, 'appliances_received', `Appliances: ${text}`);
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_panel_pref);
      await updateSession(session.id, 'panel_pref', {});
      break;
    }

    case 'panel_pref': {
      const panelPrefMap = { 1: null, 2: 'JA Solar', 3: 'Canadian Solar', 4: 'Jinko', 5: 'LONGi' };
      const pref = panelPrefMap[parseNumber(text)] || (parseNumber(text) == 6 ? text : null);
      if (pref) {
        await updateLead(lead.id, { panel_preference: pref });
      }
      await sendMessage(phoneNumber, STAGE_PROMPTS.ask_inverter_pref);
      await updateSession(session.id, 'inverter_pref', {});
      break;
    }

    case 'inverter_pref': {
      const invPrefMap = { 1: null, 2: 'Growatt', 3: 'Huawei', 4: 'Sungrow' };
      const pref = invPrefMap[parseNumber(text)] || (parseNumber(text) == 5 ? text : null);
      if (pref) {
        await updateLead(lead.id, { inverter_preference: pref });
      }

      // Qualification complete — generate quotation
      await sendMessage(phoneNumber, STAGE_PROMPTS.generating_quote);
      await updateSession(session.id, 'qualifying', {});

      lead = await pool.query('SELECT * FROM leads WHERE id = $1', [lead.id]);
      lead = lead.rows[0];

      await logActivity(lead.id, 'qualification_complete', 'All information collected');

      // Generate quotation
      generateQuotationAndSend(lead, phoneNumber, session);
      break;
    }

    case 'qualifying':
    case 'generating_quote':
      await sendMessage(phoneNumber, "Please wait, I'm preparing your quotation...");
      break;

    case 'quote_delivered':
    case 'asking_next': {
      const choice = parseNumber(text);
      if (choice === 1) {
        await requestSalesTeam(lead, phoneNumber, session);
      } else if (choice === 2) {
        await sendMessage(phoneNumber, "Great! Please share your preferred date and time for a site visit, and I'll schedule it with our technical team.");
        await updateSession(session.id, 'visit_scheduling', {});
      } else if (choice === 3) {
        await sendMessage(phoneNumber, "Sure! What would you like to know about this solar system? I can answer questions about savings, installation process, warranty, and more.");
        await updateSession(session.id, 'qa', {});
      } else if (choice === 4) {
        await updateLead(lead.id, { status: 'quoted' });
        await sendMessage(phoneNumber, "Please share what changes you'd like to make (e.g. different system size, budget, brand, battery).");
        await updateSession(session.id, 'revision', {});
      } else {
        await sendMessage(phoneNumber, STAGE_PROMPTS.ask_next);
      }
      break;
    }

    case 'revision': {
      await logActivity(lead.id, 'revision_requested', `Customer revision request: ${text}`);
      await updateLead(lead.id, { status: 'negotiating', special_requirements: text });
      await sendMessage(phoneNumber, "Noted! I'll have a sales representative contact you to adjust the quotation. You'll hear from us shortly.");
      await updateSession(session.id, 'quote_delivered', {});
      break;
    }

    case 'qa': {
      // Simple QA — could be connected to an LLM
      const answer = answerCommonQuestion(text);
      await sendMessage(phoneNumber, answer);
      await updateSession(session.id, 'quote_delivered', {});
      break;
    }

    case 'visit_scheduling': {
      await logActivity(lead.id, 'site_visit_requested', `Site visit requested: ${text}`);
      await updateLead(lead.id, { status: 'interested', special_requirements: `Site visit: ${text}` });
      await sendMessage(phoneNumber, "Perfect! I've noted the details. Our technical team will contact you to confirm the visit.");
      await updateSession(session.id, 'quote_delivered', {});
      break;
    }

    default: {
      await sendMessage(phoneNumber, STAGE_PROMPTS.greeting.replace('[Company Name]', 'Solar Solutions'));
      await updateSession(session.id, 'ask_bill', {});
    }
  }
}

async function handleBillUpload(message, lead, session) {
  try {
    const mediaId = message.image ? message.image.id : message.document.id;

    await sendMessage(message.from, "Thanks for sharing your bill! I'm reading it now...");

    // Placeholder — in production, use OCR extraction here
    // For now, estimate consumption from typical values
    const estimatedConsumption = Math.round(300 + Math.random() * 400);

    await pool.query(
      `UPDATE leads SET bill_upload_url = $1, bill_extracted_data = $2,
       monthly_consumption = $3, status = 'bill_uploaded', updated_at = NOW() WHERE id = $4`,
      [
        mediaId,
        JSON.stringify({ media_id: mediaId, provider: 'whatsapp', estimated: true }),
        estimatedConsumption,
        lead.id
      ]
    );

    await logActivity(lead.id, 'bill_uploaded', `Bill uploaded. Estimated consumption: ${estimatedConsumption} kWh`);

    await sendMessage(message.from,
      `I've analyzed your bill. Based on it, your estimated monthly consumption is around ${estimatedConsumption} kWh.\n\n` +
      STAGE_PROMPTS.ask_consumption
    );
    await updateSession(session.id, 'ask_consumption', {});
  } catch (err) {
    console.error('Bill upload error:', err);
    await sendMessage(message.from, "I had trouble reading your bill. Could you try uploading it again, or type your average monthly consumption in units?");
  }
}

async function generateQuotationAndSend(lead, phoneNumber, session) {
  try {
    // Get company products initialized for this lead
    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [lead.company_id]);

    // Call quotation generation internally (reuse logic)
    const userResult = await pool.query(
      "SELECT * FROM users WHERE company_id = $1 AND role = 'admin' LIMIT 1",
      [lead.company_id]
    );
    const adminUser = userResult.rows[0];

    const req = {
      user: { id: adminUser.id, company_id: adminUser.company_id },
      body: { lead_id: lead.id }
    };

    const jsonRes = {
      status: 201,
      json() {},
      end: () => {}
    };

    // Generate quotation inline
    const generated = await generateQuotationInline(lead, adminUser);

    if (generated.error) {
      await sendMessage(phoneNumber, `I encountered an issue generating your quotation: ${generated.error} Please contact our team directly.`);
      return;
    }

    const quotation = generated;

    // Update session and lead status
    await updateLead(lead.id, { status: 'quoted', quotation_amount: quotation.total });
    await updateSession(session.id, 'quote_delivered', {});

    // Schedule first follow-up
    await pool.query(
      `INSERT INTO followups (lead_id, quotation_id, followup_type, channel, message, scheduled_at)
       VALUES ($1, $2, 'auto', 'whatsapp', $3, datetime('now', '+1 day'))`,
      [lead.id, quotation.id, followupMessage(1, lead.customer_name)]
    );

    // Send summary
    const summary = formatQuoteSummary(quotation, lead);
    await sendMessage(phoneNumber, summary);
  } catch (err) {
    console.error('Quote generation in WhatsApp error:', err);
    await sendMessage(phoneNumber, "I'm having trouble generating your quotation right now. A sales representative will contact you shortly with your quote.");
  }
}

// Inline quotation generation (reuses the core engine logic)
async function generateQuotationInline(lead, user) {
  try {
    const pool_mod = require('../config/db');
    const companyId = user.company_id;

    const rulesResult = await pool_mod.query('SELECT * FROM pricing_rules WHERE company_id = $1', [companyId]);
    const rules = {};
    rulesResult.rows.forEach(r => { rules[r.rule_key] = JSON.parse(r.rule_value); });

    const sizingResult = await pool_mod.query(
      'SELECT * FROM sizing_rules WHERE company_id = $1 AND is_active = true ORDER BY priority',
      [companyId]
    );

    let systemSizeKw = null;
    let systemType = lead.system_type || 'hybrid';
    const consumption = lead.monthly_consumption || 500;

    for (const rule of sizingResult.rows) {
      if (consumption >= rule.min_consumption && consumption <= rule.max_consumption) {
        systemSizeKw = parseFloat(rule.recommended_system_kw);
        systemType = rule.system_type;
        break;
      }
    }
    systemSizeKw = systemSizeKw || 6;

    const productsResult = await pool_mod.query(
      `SELECT p.*, pc.name as category_name
       FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.company_id = $1 AND p.is_active = true ORDER BY pc.display_order, p.name`,
      [companyId]
    );

    const products = productsResult.rows;
    const panels = products.filter(p => p.category_name === 'Solar Panels');
    const inverters = products.filter(p => p.category_name === 'Inverters');
    const batteries = products.filter(p => p.category_name === 'Batteries');
    const accessories = products.filter(p => p.category_name === 'Accessories');
    const services = products.filter(p => p.category_name === 'Services');

    const panel = panels[0];
    const inverter = inverters[0] || inverters.find(i => true);
    const battery = batteries[0];

    if (!panel || !inverter) {
      return { error: 'Products not configured yet' };
    }

    const panelWattage = parseFloat(panel.specs?.wattage || 585);
    const panelCount = Math.ceil((systemSizeKw * 1000) / panelWattage);
    const actualSizeKw = (panelCount * panelWattage) / 1000;

    const items = [];
    items.push({
      name: `${panel.brand || ''} ${panel.name} (${panelWattage}W)`.trim(),
      description: `${panelCount} × ${panelWattage}W Panels`,
      quantity: panelCount, unit: 'pieces',
      unit_price: parseFloat(panel.unit_price),
      total_price: panelCount * parseFloat(panel.unit_price),
      item_type: 'equipment', product_id: panel.id, display_order: 0
    });

    items.push({
      name: `${inverter.brand || ''} ${inverter.name}`.trim(),
      description: `${systemSizeKw}kW ${systemType} Inverter`,
      quantity: 1, unit: 'piece',
      unit_price: parseFloat(inverter.unit_price),
      total_price: parseFloat(inverter.unit_price),
      item_type: 'equipment', product_id: inverter.id, display_order: 1
    });

    if (battery && (systemType === 'hybrid' || systemType === 'off_grid')) {
      const batteryQty = systemType === 'off_grid' ? 2 : 1;
      items.push({
        name: `${battery.brand || ''} ${battery.name}`.trim(),
        description: 'Battery Storage',
        quantity: batteryQty, unit: 'pieces',
        unit_price: parseFloat(battery.unit_price),
        total_price: batteryQty * parseFloat(battery.unit_price),
        item_type: 'equipment', product_id: battery.id, display_order: 2
      });
    }

    // Accessories
    const structure = accessories.find(a => a.name.toLowerCase().includes('mounting') || a.name.toLowerCase().includes('structure'));
    if (structure) {
      items.push({ name: structure.name, description: 'Mounting structure', quantity: 1, unit: 'set',
        unit_price: parseFloat(structure.unit_price), total_price: parseFloat(structure.unit_price),
        item_type: 'equipment', product_id: structure.id, display_order: 3 });
    }

    const dcCable = accessories.find(a => a.name.toLowerCase().includes('dc') && a.name.toLowerCase().includes('cable'));
    if (dcCable) {
      const dcMeters = Math.ceil(panelCount * 3);
      items.push({ name: dcCable.name, description: `${dcMeters}m DC cable`, quantity: dcMeters, unit: 'meters',
        unit_price: parseFloat(dcCable.unit_price), total_price: dcMeters * parseFloat(dcCable.unit_price),
        item_type: 'equipment', product_id: dcCable.id, display_order: 4 });
    }

    const acCable = accessories.find(a => a.name.toLowerCase().includes('ac') && a.name.toLowerCase().includes('cable'));
    if (acCable) {
      items.push({ name: acCable.name, description: '15m AC cable', quantity: 15, unit: 'meters',
        unit_price: parseFloat(acCable.unit_price), total_price: 15 * parseFloat(acCable.unit_price),
        item_type: 'equipment', product_id: acCable.id, display_order: 5 });
    }

    const protection = accessories.filter(a =>
      a.name.toLowerCase().includes('distribution') || a.name.toLowerCase().includes('surge') ||
      a.name.toLowerCase().includes('breaker') || a.name.toLowerCase().includes('fuse'));
    for (const p of protection) {
      items.push({ name: p.name, description: p.name, quantity: 1, unit: 'piece',
        unit_price: parseFloat(p.unit_price), total_price: parseFloat(p.unit_price),
        item_type: 'equipment', product_id: p.id, display_order: items.length });
    }

    const install = services.find(s => s.name.toLowerCase().includes('install'));
    if (install) {
      items.push({ name: install.name, description: `Installation for ${actualSizeKw}kW`, quantity: actualSizeKw, unit: 'kW',
        unit_price: parseFloat(install.unit_price), total_price: actualSizeKw * parseFloat(install.unit_price),
        item_type: 'service', product_id: install.id, display_order: items.length });
    }

    const transport = services.find(s => s.name.toLowerCase().includes('transport'));
    if (transport) {
      items.push({ name: transport.name, description: 'Transportation', quantity: 1, unit: 'trip',
        unit_price: parseFloat(transport.unit_price), total_price: parseFloat(transport.unit_price),
        item_type: 'service', product_id: transport.id, display_order: items.length });
    }

    const equipmentSubtotal = items.filter(i => i.item_type === 'equipment').reduce((s, i) => s + i.total_price, 0);
    const servicesSubtotal = items.filter(i => i.item_type === 'service').reduce((s, i) => s + i.total_price, 0);
    const subtotal = equipmentSubtotal + servicesSubtotal;

    const marginPct = rules.margin_percentage || 8;
    const marginAmount = subtotal * (marginPct / 100);
    const afterMargin = subtotal + marginAmount;
    const taxPct = rules.tax_percentage || 17;
    const taxAmount = afterMargin * (taxPct / 100);
    const total = afterMargin + taxAmount;

    const monthlyUnits = lead.monthly_consumption || 500;
    const solarGen = actualSizeKw * 4.5 * 30;
    const monthlySavings = Math.min(solarGen, monthlyUnits) * 40;
    const annualSavings = monthlySavings * 12;
    const paybackYears = total / annualSavings;

    const refResult = await pool_mod.query('SELECT COUNT(*) as count FROM quotations WHERE company_id = $1', [companyId]);
    const refNum = `QT-${new Date().getFullYear()}-${String(parseInt(refResult.rows[0].count) + 1).padStart(4, '0')}`;

    const tResult = await pool_mod.query('SELECT * FROM quotation_templates WHERE company_id = $1 AND is_default = true', [companyId]);
    const template = tResult.rows[0];
    const validityDays = template?.validity_days || 15;

    const quotationResult = await pool_mod.query(
      `INSERT INTO quotations (company_id, lead_id, template_id, reference_number, system_type, system_size_kw, items,
        equipment_subtotal, services_subtotal, subtotal, margin_percentage, margin_amount, tax_percentage, tax_amount,
        total, monthly_savings, annual_savings, payback_years, status, valid_until, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [companyId, lead.id, template?.id || null, refNum, systemType, actualSizeKw, JSON.stringify(items),
        equipmentSubtotal, servicesSubtotal, subtotal, marginPct, marginAmount, taxPct, taxAmount,
        total, monthlySavings, annualSavings, paybackYears.toFixed(1), 'draft',
        new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        user.id]
    );

    const quotation = quotationResult.rows[0];
    for (const item of items) {
      await pool_mod.query(
        `INSERT INTO quotation_items (quotation_id, product_id, name, description, quantity, unit, unit_price, total_price, item_type, display_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [quotation.id, item.product_id, item.name, item.description, item.quantity, item.unit,
         item.unit_price, item.total_price, item.item_type, item.display_order]
      );
    }

    await pool_mod.query(
      `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, metadata)
       VALUES ($1, $2, 'quotation_generated', $3, $4)`,
      [lead.id, user.id, `Quotation ${refNum} generated - Rs ${total.toLocaleString()}`,
       JSON.stringify({ quotation_id: quotation.id, total, system_size: actualSizeKw })]
    );

    return { ...quotation, items };
  } catch (err) {
    console.error('Inline quotation error:', err);
    return { error: 'Internal quotation error' };
  }
}

function formatQuoteSummary(quotation, lead) {
  const items = quotation.items || [];
  const panelItems = items.filter(i => i.name.toLowerCase().includes('panel') || i.description.toLowerCase().includes('w'));
  const inverterItems = items.filter(i => i.name.toLowerCase().includes('inverter'));

  let summary = `Bismillah! ☀️ Here's your solar quotation:\n\n`;
  summary += `📋 Reference: ${quotation.reference_number}\n\n`;
  summary += `Suggested System: ${quotation.system_size_kw} kW ${quotation.system_type === 'hybrid' ? 'Hybrid' : quotation.system_type}\n\n`;
  summary += `Key Components:\n`;
  if (panelItems.length) summary += `🔧 ${panelItems[0].description}\n`;
  if (inverterItems.length) summary += `⚡ ${inverterItems[0].name}\n`;
  summary += `🔋 Battery Backup\n`;
  summary += `🏗️ Mounting Structure & Cables\n`;
  summary += `🛡️ Full Protection System\n`;
  summary += `👷 Installation & Commissioning\n\n`;
  summary += `💰 Total: Rs ${Number(quotation.total).toLocaleString()}\n\n`;
  summary += `📈 Estimated Monthly Savings: Rs ${Number(quotation.monthly_savings).toLocaleString()}\n`;
  summary += `📅 Payback Period: ~${quotation.payback_years} years\n\n`;

  summary += `What would you like to do next?\n`;
  summary += `1️⃣ Talk to our sales team\n`;
  summary += `2️⃣ Schedule a site visit\n`;
  summary += `3️⃣ Ask questions\n`;
  summary += `4️⃣ Get a revised quotation`;

  return summary;
}

function followupMessage(day, name) {
  const messages = {
    1: `Hi ${name || 'there'}! Hope you're doing well. Just checking if you had a chance to review your solar proposal. Happy to answer any questions!`,
    3: `Hi ${name || 'there'}! Here's a quick look at your potential savings: your current bill vs. solar bill difference means you could save the equivalent of your old bill within a few years. Interested to discuss further?`,
    5: `Hi ${name || 'there'}! Quick heads up — we have a batch of panels reserved at current pricing, but prices may adjust soon. Would you like to lock in today's rates?`,
  };
  return messages[day] || messages[5];
}

async function requestSalesTeam(lead, phoneNumber, session) {
  await updateLead(lead.id, { status: 'interested' });
  await logActivity(lead.id, 'sales_handoff', 'Customer requested to talk to sales team');

  // Assign to a salesperson (round-robin / least loaded)
  const assignee = await pool.query(
    `SELECT u.* FROM users u
     WHERE u.company_id = $1 AND u.role = 'salesperson' AND u.is_active = true
     ORDER BY (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.status NOT IN ('won', 'lost', 'completed'))
     LIMIT 1`,
    [lead.company_id]
  );

  if (assignee.rows.length > 0) {
    await updateLead(lead.id, { assigned_to: assignee.rows[0].id });
    await logActivity(lead.id, 'assigned', `Assigned to ${assignee.rows[0].name}`);
  }

  await sendMessage(phoneNumber, "I've connected you with our sales team. A sales representative will contact you shortly! Feel free to ask any questions in the meantime.");
}

async function answerCommonQuestion(text) {
  const t = text.toLowerCase();
  if (t.includes('price') || t.includes('cost') || t.includes('rate')) {
    return "Our quotations include ALL components — panels, inverter, battery, structure, cables, protection, installation, and taxes. What you see is the final price. We can also adjust the system size to fit your budget!";
  }
  if (t.includes('saving') || t.includes('save') || t.includes('bill')) {
    return "With a properly sized system, most customers save 80-95% of their electricity bill. Your quotation includes a detailed savings projection based on your consumption.";
  }
  if (t.includes('install')) {
    return "Installation typically takes 3-5 working days. Our certified team handles everything — structure, panels, inverter, wiring, and grid connection.";
  }
  if (t.includes('warrant')) {
    return "Panels come with a 25-year performance warranty and 12-year product warranty. Inverters have 5-10 year warranty depending on brand, and batteries 5-10 years.";
  }
  if (t.includes('install') && t.includes('cost')) {
    return "Installation is included in your quotation! There are no hidden costs.";
  }
  return "Good question! Let me connect you with our technical team who can give you a detailed answer. They'll reach out shortly.";
}

async function updateSession(sessionId, state, context) {
  await pool.query(
    'UPDATE whatsapp_sessions SET conversation_state = $1, context = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $3',
    [state, JSON.stringify(context || {}), sessionId]
  );
}

async function updateLead(leadId, fields) {
  const allowed = ['customer_name', 'customer_phone', 'customer_email', 'customer_city', 'customer_address',
    'monthly_consumption', 'system_type', 'budget_min', 'budget_max', 'roof_area', 'battery_required',
    'battery_preference', 'panel_preference', 'inverter_preference', 'appliances', 'special_requirements',
    'status', 'assigned_to', 'temperature', 'lost_reason', 'quotation_id', 'quotation_amount'];

  const updates = [];
  const values = [];
  let paramCount = 0;

  for (const field of allowed) {
    if (fields[field] !== undefined) {
      paramCount++;
      updates.push(`${field} = $${paramCount}`);
      values.push(fields[field]);
    }
  }

  if (updates.length === 0) return;

  paramCount++;
  updates.push('updated_at = NOW()');
  values.push(leadId);

  await pool.query(
    `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

async function logActivity(leadId, type, description) {
  await pool.query(
    'INSERT INTO lead_activities (lead_id, activity_type, description) VALUES ($1, $2, $3)',
    [leadId, type, description]
  );
}

function normalizeText(text) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseIntent(text) {
  if (/(solar|panel|lagwana|install|system|price|rate|cost)/.test(text)) return 'solar_inquiry';
  if (/(bill|bijli|electricity)/.test(text)) return 'bill_related';
  return 'general';
}

function parseNumber(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}