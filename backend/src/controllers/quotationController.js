const pool = require('../config/db');
const PDFDocument = require('pdfkit');

// Generate quotation from lead requirements
exports.generate = async (req, res) => {
  try {
    const { lead_id, template_id, overrides } = req.body;

    // Get lead
    const leadResult = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND company_id = $2',
      [lead_id, req.user.company_id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadResult.rows[0];

    // Get company pricing rules
    const rulesResult = await pool.query(
      'SELECT * FROM pricing_rules WHERE company_id = $1',
      [req.user.company_id]
    );
    const rules = {};
    rulesResult.rows.forEach(r => { rules[r.rule_key] = JSON.parse(r.rule_value); });

    // Get sizing rules
    const sizingResult = await pool.query(
      'SELECT * FROM sizing_rules WHERE company_id = $1 AND is_active = true ORDER BY priority',
      [req.user.company_id]
    );

    // Determine system size
    let systemSizeKw = overrides?.system_size_kw;
    let systemType = lead.system_type || 'hybrid';

    if (!systemSizeKw) {
      const consumption = lead.monthly_consumption || 500;
      for (const rule of sizingResult.rows) {
        if (consumption >= rule.min_consumption && consumption <= rule.max_consumption) {
          systemSizeKw = parseFloat(rule.recommended_system_kw);
          systemType = rule.system_type;
          break;
        }
      }
      systemSizeKw = systemSizeKw || 6;
    }

    // Get products by category
    const productsResult = await pool.query(
      `SELECT p.*, pc.name as category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.company_id = $1 AND p.is_active = true
       ORDER BY pc.display_order, p.name`,
      [req.user.company_id]
    );

    const products = productsResult.rows;
    const panels = products.filter(p => p.category_name === 'Solar Panels');
    const inverters = products.filter(p => p.category_name === 'Inverters');
    const batteries = products.filter(p => p.category_name === 'Batteries');
    const accessories = products.filter(p => p.category_name === 'Accessories');
    const services = products.filter(p => p.category_name === 'Services');

    // Select best matching products
    const panel = panels[0];
    const inverter = inverters.find(i => {
      const capacity = parseFloat(i.specs?.capacity_kw || i.model?.match(/(\d+)/)?.[1] || 6);
      return capacity >= systemSizeKw;
    }) || inverters[0];

    const battery = batteries[0];

    if (!panel || !inverter) {
      return res.status(400).json({ error: 'Insufficient products configured. Please add panels and inverters first.' });
    }

    // Calculate quantities
    const panelWattage = parseFloat(panel.specs?.wattage || 585);
    const panelCount = Math.ceil((systemSizeKw * 1000) / panelWattage);
    const actualSizeKw = (panelCount * panelWattage) / 1000;

    // Build line items
    const items = [];
    let itemOrder = 0;

    // Panels
    items.push({
      name: `${panel.brand || ''} ${panel.name} (${panelWattage}W)`.trim(),
      description: `${panelCount} × ${panelWattage}W Solar Panels`,
      quantity: panelCount,
      unit: 'pieces',
      unit_price: parseFloat(panel.unit_price),
      total_price: panelCount * parseFloat(panel.unit_price),
      item_type: 'equipment',
      product_id: panel.id,
      display_order: itemOrder++,
    });

    // Inverter
    items.push({
      name: `${inverter.brand || ''} ${inverter.name}`.trim(),
      description: `${systemSizeKw}kW ${systemType === 'hybrid' ? 'Hybrid' : systemType === 'on_grid' ? 'On-Grid' : 'Off-Grid'} Inverter`,
      quantity: 1,
      unit: 'piece',
      unit_price: parseFloat(inverter.unit_price),
      total_price: parseFloat(inverter.unit_price),
      item_type: 'equipment',
      product_id: inverter.id,
      display_order: itemOrder++,
    });

    // Battery (if hybrid or off-grid)
    if (battery && (systemType === 'hybrid' || systemType === 'off_grid')) {
      const batteryQty = systemType === 'off_grid' ? 2 : 1;
      items.push({
        name: `${battery.brand || ''} ${battery.name}`.trim(),
        description: `${batteryQty > 1 ? batteryQty + ' × ' : ''}Battery Storage`,
        quantity: batteryQty,
        unit: 'pieces',
        unit_price: parseFloat(battery.unit_price),
        total_price: batteryQty * parseFloat(battery.unit_price),
        item_type: 'equipment',
        product_id: battery.id,
        display_order: itemOrder++,
      });
    }

    // Mounting Structure
    const structureItem = accessories.find(a => a.name.toLowerCase().includes('mounting') || a.name.toLowerCase().includes('structure'));
    if (structureItem) {
      items.push({
        name: structureItem.name,
        description: 'Mounting structure for all panels',
        quantity: 1,
        unit: 'set',
        unit_price: parseFloat(structureItem.unit_price),
        total_price: parseFloat(structureItem.unit_price),
        item_type: 'equipment',
        product_id: structureItem.id,
        display_order: itemOrder++,
      });
    }

    // DC Cable
    const dcCable = accessories.find(a => a.name.toLowerCase().includes('dc') && a.name.toLowerCase().includes('cable'));
    if (dcCable) {
      const dcMeters = Math.ceil(panelCount * 3);
      items.push({
        name: dcCable.name,
        description: `${dcMeters}m DC Solar Cable`,
        quantity: dcMeters,
        unit: 'meters',
        unit_price: parseFloat(dcCable.unit_price),
        total_price: dcMeters * parseFloat(dcCable.unit_price),
        item_type: 'equipment',
        product_id: dcCable.id,
        display_order: itemOrder++,
      });
    }

    // AC Cable
    const acCable = accessories.find(a => a.name.toLowerCase().includes('ac') && a.name.toLowerCase().includes('cable'));
    if (acCable) {
      const acMeters = 15;
      items.push({
        name: acCable.name,
        description: `${acMeters}m AC Cable`,
        quantity: acMeters,
        unit: 'meters',
        unit_price: parseFloat(acCable.unit_price),
        total_price: acMeters * parseFloat(acCable.unit_price),
        item_type: 'equipment',
        product_id: acCable.id,
        display_order: itemOrder++,
      });
    }

    // Protection items
    const protectionItems = accessories.filter(a =>
      a.name.toLowerCase().includes('distribution') ||
      a.name.toLowerCase().includes('surge') ||
      a.name.toLowerCase().includes('breaker') ||
      a.name.toLowerCase().includes('fuse')
    );
    for (const pItem of protectionItems) {
      items.push({
        name: pItem.name,
        description: pItem.description || pItem.name,
        quantity: 1,
        unit: 'piece',
        unit_price: parseFloat(pItem.unit_price),
        total_price: parseFloat(pItem.unit_price),
        item_type: 'equipment',
        product_id: pItem.id,
        display_order: itemOrder++,
      });
    }

    // Installation service
    const installService = services.find(s => s.name.toLowerCase().includes('install'));
    if (installService) {
      items.push({
        name: installService.name,
        description: `Installation & commissioning for ${actualSizeKw}kW system`,
        quantity: actualSizeKw,
        unit: 'kW',
        unit_price: parseFloat(installService.unit_price),
        total_price: actualSizeKw * parseFloat(installService.unit_price),
        item_type: 'service',
        product_id: installService.id,
        display_order: itemOrder++,
      });
    }

    // Transportation
    const transportService = services.find(s => s.name.toLowerCase().includes('transport'));
    if (transportService) {
      items.push({
        name: transportService.name,
        description: 'Material transportation to site',
        quantity: 1,
        unit: 'trip',
        unit_price: parseFloat(transportService.unit_price),
        total_price: parseFloat(transportService.unit_price),
        item_type: 'service',
        product_id: transportService.id,
        display_order: itemOrder++,
      });
    }

    // Calculate totals
    const equipmentSubtotal = items.filter(i => i.item_type === 'equipment').reduce((sum, i) => sum + i.total_price, 0);
    const servicesSubtotal = items.filter(i => i.item_type === 'service').reduce((sum, i) => sum + i.total_price, 0);
    const subtotal = equipmentSubtotal + servicesSubtotal;

    const marginPct = rules.margin_percentage || 8;
    const marginAmount = subtotal * (marginPct / 100);
    const afterMargin = subtotal + marginAmount;

    const taxPct = rules.tax_percentage || 17;
    const taxAmount = afterMargin * (taxPct / 100);

    const total = afterMargin + taxAmount;

    // Savings projection
    const avgBillPerUnit = 40; // PKR per unit approximate
    const monthlyUnits = lead.monthly_consumption || 500;
    const solarGeneration = actualSizeKw * 4.5 * 30; // 4.5 peak sun hours avg
    const monthlySavings = Math.min(solarGeneration, monthlyUnits) * avgBillPerUnit;
    const annualSavings = monthlySavings * 12;
    const paybackYears = total / annualSavings;

    // Generate reference number
    const refResult = await pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE company_id = $1`,
      [req.user.company_id]
    );
    const refNum = `QT-${new Date().getFullYear()}-${String(parseInt(refResult.rows[0].count) + 1).padStart(4, '0')}`;

    // Get template
    let template = null;
    if (template_id) {
      const tResult = await pool.query('SELECT * FROM quotation_templates WHERE id = $1 AND company_id = $2', [template_id, req.user.company_id]);
      template = tResult.rows[0];
    } else {
      const tResult = await pool.query('SELECT * FROM quotation_templates WHERE company_id = $1 AND is_default = true', [req.user.company_id]);
      template = tResult.rows[0];
    }

    const validityDays = template?.validity_days || 15;

    // Save quotation
    const quotationResult = await pool.query(
      `INSERT INTO quotations (
        company_id, lead_id, template_id, reference_number,
        system_type, system_size_kw, items,
        equipment_subtotal, services_subtotal, subtotal,
        margin_percentage, margin_amount, tax_percentage, tax_amount,
        total, monthly_savings, annual_savings, payback_years,
        status, valid_until, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *`,
      [
        req.user.company_id, lead_id, template?.id || null, refNum,
        systemType, actualSizeKw, JSON.stringify(items),
        equipmentSubtotal, servicesSubtotal, subtotal,
        marginPct, marginAmount, taxPct, taxAmount,
        total, monthlySavings, annualSavings, paybackYears.toFixed(1),
        'draft',
        new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        req.user.id
      ]
    );

    const quotation = quotationResult.rows[0];

    // Save individual items
    for (const item of items) {
      await pool.query(
        `INSERT INTO quotation_items (quotation_id, product_id, name, description, quantity, unit, unit_price, total_price, item_type, display_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [quotation.id, item.product_id, item.name, item.description, item.quantity,
         item.unit, item.unit_price, item.total_price, item.item_type, item.display_order]
      );
    }

    // Update lead
    await pool.query(
      `UPDATE leads SET quotation_id = $1, quotation_amount = $2, status = 'quoted', updated_at = NOW()
       WHERE id = $3`,
      [quotation.id, total, lead_id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, metadata)
       VALUES ($1, $2, 'quotation_generated', $3, $4)`,
      [lead_id, req.user.id, `Quotation ${refNum} generated - Rs ${total.toLocaleString()}`,
       JSON.stringify({ quotation_id: quotation.id, total, system_size: actualSizeKw })]
    );

    res.status(201).json({
      quotation: {
        ...quotation,
        items,
        company: (await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id])).rows[0],
        lead: lead,
        template,
      },
    });
  } catch (err) {
    console.error('Generate quotation error:', err);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { status, lead_id } = req.query;
    let query = `
      SELECT q.*, l.customer_name, l.customer_phone, l.customer_city
      FROM quotations q
      LEFT JOIN leads l ON q.lead_id = l.id
      WHERE q.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND q.status = $${paramCount}`;
      params.push(status);
    }

    if (lead_id) {
      paramCount++;
      query += ` AND q.lead_id = $${paramCount}`;
      params.push(lead_id);
    }

    query += ' ORDER BY q.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
};

exports.getById = async (req, res) => {
  try {
    const qResult = await pool.query(
      `SELECT q.*, l.customer_name, l.customer_phone, l.customer_email, l.customer_city,
              l.monthly_consumption, l.system_type as lead_system_type
       FROM quotations q
       LEFT JOIN leads l ON q.lead_id = l.id
       WHERE q.id = $1 AND q.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (qResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const items = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY display_order',
      [req.params.id]
    );

    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);

    res.json({
      ...qResult.rows[0],
      items: items.rows,
      company: company.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE quotations SET status = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.downloadPdf = async (req, res) => {
  try {
    const qResult = await pool.query(
      `SELECT q.*, l.customer_name, l.customer_phone, l.customer_email, l.customer_city, l.monthly_consumption
       FROM quotations q
       LEFT JOIN leads l ON q.lead_id = l.id
       WHERE q.id = $1 AND q.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (qResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const quotation = qResult.rows[0];
    const items = await pool.query(
      'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY display_order',
      [req.params.id]
    );
    const company = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);

    const companyData = company.rows[0] || {};
    const brandColor = /^#[0-9a-fA-F]{6}$/.test(companyData.brand_color || '') ? companyData.brand_color : '#f59e0b';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${quotation.reference_number}.pdf`);
    doc.pipe(res);

    // Brand color header bar
    doc.rect(0, 0, 595.28, 8).fill(brandColor);

    // Header — logo (embedded base64) if provided, company name below it
    const logoData = (companyData.logo_data || '').trim();
    if (logoData && logoData.startsWith('data:image/')) {
      const m = logoData.match(/^data:(image\/(?:png|jpe?g));base64,(.+)$/);
      if (m) {
        try {
          doc.image(Buffer.from(m[2], 'base64'), { width: 90, align: 'center' });
          doc.moveDown(0.4);
        } catch (_) {
          // fall through to company name only
        }
      }
    }
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text(companyData.name || 'Solar Company', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#475569').text(companyData.address || '', { align: 'center' });
    doc.text(`Phone: ${companyData.phone || 'N/A'} | Email: ${companyData.email || 'N/A'}`, { align: 'center' });
    if (companyData.gst_number) {
      doc.text(`GST: ${companyData.gst_number}`, { align: 'center' });
    }
    doc.moveDown();

    // Quotation title (brand colored)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(brandColor).text('QUOTATION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`Reference: ${quotation.reference_number}`);
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString('en-PK')}`);
    doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString('en-PK')}`);
    doc.moveDown();

    // Customer details
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('Client Details');
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`Name: ${quotation.customer_name || 'N/A'}`);
    doc.text(`Phone: ${quotation.customer_phone || 'N/A'}`);
    doc.text(`City: ${quotation.customer_city || 'N/A'}`);
    doc.text(`Monthly Consumption: ${quotation.monthly_consumption || 'N/A'} kWh`);
    doc.moveDown();

    // System recommendation
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('Recommended System');
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`System Type: ${quotation.system_type === 'hybrid' ? 'Hybrid' : quotation.system_type === 'on_grid' ? 'On-Grid' : 'Off-Grid'}`);
    doc.text(`System Size: ${quotation.system_size_kw} kW`);
    doc.moveDown();

    // Items table
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('Cost Breakdown');
    doc.fillColor('#334155').fontSize(10).font('Helvetica');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const colWidths = [200, 60, 60, 100, 100];
    const headers = ['Item', 'Qty', 'Unit', 'Unit Price', 'Total'];

    doc.fontSize(8).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
      xPos += colWidths[i] + 10;
    });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 20;

    for (const item of items.rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      xPos = 50;
      doc.text(item.name.substring(0, 35), xPos, y, { width: colWidths[0] });
      doc.text(String(item.quantity), xPos + colWidths[0] + 10, y, { width: colWidths[1], align: 'right' });
      doc.text(item.unit, xPos + colWidths[0] + colWidths[1] + 20, y, { width: colWidths[2], align: 'right' });
      doc.text(`Rs ${Number(item.unit_price).toLocaleString()}`, xPos + colWidths[0] + colWidths[1] + colWidths[2] + 30, y, { width: colWidths[3], align: 'right' });
      doc.text(`Rs ${Number(item.total_price).toLocaleString()}`, xPos + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 40, y, { width: colWidths[4], align: 'right' });
      y += 18;
    }

    // Totals
    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    const drawTotal = (label, value, bold = false) => {
      if (bold) {
        doc.fillColor(brandColor);
      } else {
        doc.fillColor('#334155');
      }
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(label, 350, y, { width: 150, align: 'right' });
      doc.text(`Rs ${Number(value).toLocaleString()}`, 500, y, { width: 100, align: 'right' });
      y += 18;
      doc.fillColor('#334155');
    };

    drawTotal('Equipment Subtotal:', quotation.equipment_subtotal);
    drawTotal('Services Subtotal:', quotation.services_subtotal);
    drawTotal(`Margin (${quotation.margin_percentage}%):`, quotation.margin_amount);
    drawTotal(`Tax (${quotation.tax_percentage}%):`, quotation.tax_amount);
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 5;
    drawTotal('TOTAL:', quotation.total, true);

    // Savings projection
    y += 20;
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('Savings Projection', 50, y);
    y += 20;
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`Estimated Monthly Savings: Rs ${Number(quotation.monthly_savings).toLocaleString()}`, 50, y);
    y += 15;
    doc.text(`Estimated Annual Savings: Rs ${Number(quotation.annual_savings).toLocaleString()}`, 50, y);
    y += 15;
    doc.text(`Estimated Payback Period: ${quotation.payback_years} years`, 50, y);

    // Terms & conditions
    y += 30;
    if (y > 650) {
      doc.addPage();
      y = 50;
    }
    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('Terms & Conditions', 50, y);
    y += 20;
    doc.fontSize(8).font('Helvetica').fillColor('#334155');

    const terms = companyData.terms || `1. This quotation is valid for 15 days.\n2. 50% advance payment required.\n3. Installation within 3-5 working days.`;
    const termsLines = terms.split('\n');
    for (const line of termsLines) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      doc.text(line.trim(), 50, y, { width: 500 });
      y += 12;
    }

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
