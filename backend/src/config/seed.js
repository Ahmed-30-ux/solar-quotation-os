const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding demo data...');

    // Create demo company
    const companyResult = await db.query(
      `INSERT INTO companies (name, phone, email, address, city, gst_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['SunPeak Solar Solutions', '+92 300 1234567', 'info@sunpeak.pk',
       'Office 12, Gulberg III', 'Lahore', 'GST-PK-1234567']
    );
    const companyId = companyResult.rows[0].id;
    console.log('  Company created:', companyId);

    // Create admin user
    const adminHash = await bcrypt.hash('admin123', 12);
    const adminResult = await db.query(
      `INSERT INTO users (company_id, name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id`,
      [companyId, 'Admin', 'admin@sunpeak.pk', '+92 300 0000001', adminHash]
    );
    const adminId = adminResult.rows[0].id;
    console.log('  Admin created:', adminId);

    // Create salespersons
    const salesHash = await bcrypt.hash('sales123', 12);
    const salesNames = ['Ahmed Khan', 'Usman Ali', 'Bilal Hussain'];
    const salespeople = [];
    for (let i = 0; i < 3; i++) {
      const result = await db.query(
        `INSERT INTO users (company_id, name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, 'salesperson') RETURNING id`,
        [companyId, salesNames[i], `sales${i + 1}@sunpeak.pk`, `+92 300 000000${i + 2}`, salesHash]
      );
      salespeople.push(result.rows[0]);
    }
    console.log('  Salespeople created:', salespeople.length);

    // Categories
    const categories = {};
    const categoryNames = ['Solar Panels', 'Inverters', 'Batteries', 'Accessories', 'Services'];
    for (let i = 0; i < categoryNames.length; i++) {
      const result = await db.query(
        'INSERT INTO product_categories (company_id, name, display_order) VALUES ($1, $2, $3) RETURNING id',
        [companyId, categoryNames[i], i]
      );
      categories[i] = result.rows[0].id;
    }
    console.log('  Categories created:', categoryNames.length);

    // Products
    const panelSpecs = JSON.stringify({ wattage: 585 });
    const productData = [
      ['585W Mono Panel', 'JA Solar', 'JAM72S30', 'pieces', 28000, 25000, panelSpecs, categories[0]],
      ['455W Mono Panel', 'Longi', 'LR5-54HPH', 'pieces', 18000, 16000, JSON.stringify({ wattage: 455 }), categories[0]],
      ['6kW Hybrid Inverter', 'Growatt', 'SPH6000TL3-XP', 'pieces', 185000, 170000, JSON.stringify({ capacity_kw: 6 }), categories[1]],
      ['3kW On-Grid Inverter', 'Growatt', 'MIN3000', 'pieces', 75000, 68000, JSON.stringify({ capacity_kw: 3 }), categories[1]],
      ['10kW Hybrid Inverter', 'Huawei', 'SUN2000-10K-M1', 'pieces', 320000, 290000, JSON.stringify({ capacity_kw: 10 }), categories[1]],
      ['51.2V 100Ah Lithium Battery', 'Growatt', 'ARK2.5L-A', 'pieces', 210000, 190000, JSON.stringify({ capacity_kwh: 5.12 }), categories[2]],
      ['51.2V 200Ah Lithium Battery', 'Growatt', 'ARK5.1L-A', 'pieces', 395000, 360000, JSON.stringify({ capacity_kwh: 10.24 }), categories[2]],
      ['Mounting Structure Kit', 'Generic', 'MS-11', 'sets', 65000, 55000, JSON.stringify({ type: 'tilted' }), categories[3]],
      ['DC Solar Cable 6mm', 'Generic', 'DC-6', 'meters', 400, 320, '{}', categories[3]],
      ['AC Cable 4mm', 'Generic', 'AC-4', 'meters', 500, 400, '{}', categories[3]],
      ['DC Distribution Box', 'Generic', 'DCDB-2', 'pieces', 8000, 6500, '{}', categories[3]],
      ['AC Distribution Box', 'Generic', 'ACDB', 'pieces', 12000, 10000, '{}', categories[3]],
      ['Surge Protection Device', 'Generic', 'SPD', 'pieces', 3000, 2500, '{}', categories[3]],
      ['Earthing Kit', 'Generic', 'EK-2', 'sets', 5000, 4000, '{}', categories[3]],
      ['Installation & Commissioning', 'Service', 'INSTALL', 'kW', 10000, 8000, '{}', categories[4]],
      ['Transportation', 'Service', 'TRANSPORT', 'trips', 15000, 12000, '{}', categories[4]],
    ];

    for (const p of productData) {
      await db.query(
        `INSERT INTO products (company_id, category_id, name, brand, model, unit, unit_price, cost_price, specs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [companyId, p[7], p[0], p[1], p[2], p[3], p[4], p[5], p[6]]
      );
    }
    console.log('  Products created:', productData.length);

    // Pricing rules
    const pricingData = [
      ['margin_percentage', 8, 'Company margin %'],
      ['tax_percentage', 17, 'GST/Tax %'],
      ['installation_per_kw', 10000, 'Installation cost per kW'],
      ['transport_flat', 15000, 'Flat transportation cost'],
    ];
    for (const rule of pricingData) {
      await db.query(
        `INSERT INTO pricing_rules (company_id, rule_key, rule_value, description)
         VALUES ($1, $2, $3, $4)`,
        [companyId, rule[0], JSON.stringify(rule[1]), rule[2]]
      );
    }
    console.log('  Pricing rules created:', pricingData.length);

    // Sizing rules
    const sizingData = [
      ['Small Home', 0, 300, 3, 'hybrid'],
      ['Medium Home', 300, 600, 6, 'hybrid'],
      ['Large Home', 600, 1000, 10, 'hybrid'],
      ['Commercial', 1000, 999999, 20, 'on_grid'],
    ];
    for (let i = 0; i < sizingData.length; i++) {
      const s = sizingData[i];
      await db.query(
        `INSERT INTO sizing_rules (company_id, name, min_consumption, max_consumption, recommended_system_kw, system_type, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [companyId, s[0], s[1], s[2], s[3], s[4], i]
      );
    }
    console.log('  Sizing rules created:', sizingData.length);

    // Quotation template
    await db.query(
      `INSERT INTO quotation_templates (company_id, name, terms_conditions, validity_days, is_default)
       VALUES ($1, 'Standard Template',
       '1. This quotation is valid for 15 days from the date of issue.\n2. 50% advance payment required to proceed.\n3. Installation will be completed within 3-5 working days after advance payment.\n4. Panels carry 25-year performance warranty, inverter 10 years, battery 10 years.\n5. Net metering assistance included.\n6. Prices are subject to change after the validity period.',
       15, true)`,
      [companyId]
    );
    console.log('  Quotation template created');

    // Demo leads
    const leadData = [
      { name: 'Ahmed Raza', city: 'Lahore', consumption: 540, type: 'hybrid', status: 'new', assignee: salespeople[0] },
      { name: 'Usman Tariq', city: 'Islamabad', consumption: 720, type: 'hybrid', status: 'qualified', assignee: salespeople[1] },
      { name: 'Hamza Sheikh', city: 'Karachi', consumption: 850, type: 'on_grid', status: 'quoted', assignee: salespeople[2], quote: 1400000 },
      { name: 'Ali Nawaz', city: 'Faisalabad', consumption: 430, type: 'hybrid', status: 'interested', assignee: salespeople[0], quote: 1150000 },
      { name: 'Bilal Shah', city: 'Lahore', consumption: 900, type: 'on_grid', status: 'negotiating', assignee: salespeople[1], quote: 1350000 },
      { name: 'Zain Abbas', city: 'Multan', consumption: 620, type: 'hybrid', status: 'site_visit_scheduled', assignee: salespeople[2], quote: 1250000 },
      { name: 'Omar Farooq', city: 'Peshawar', consumption: 380, type: 'hybrid', status: 'contract_signed', assignee: salespeople[0], quote: 990000 },
      { name: 'Faisal Mahmood', city: 'Rawalpindi', consumption: 780, type: 'hybrid', status: 'won', assignee: salespeople[1], quote: 1320000 },
      { name: 'Salman Mir', city: 'Lahore', consumption: 500, type: 'hybrid', status: 'won', assignee: salespeople[2], quote: 1100000 },
      { name: 'Imran Qasim', city: 'Karachi', consumption: 1100, type: 'on_grid', status: 'lost', assignee: salespeople[0], quote: 1800000, lost_reason: 'Too expensive' },
    ];

    for (const data of leadData) {
      const temperature =
        data.status === 'won' || data.status === 'hot' ? 'hot' :
        ['interested', 'negotiating', 'quoted'].includes(data.status) ? 'warm' : 'cold';

      const result = await db.query(
        `INSERT INTO leads (company_id, assigned_to, customer_name, customer_phone, customer_city,
           monthly_consumption, system_type, roof_area, budget_min, budget_max, battery_required,
           appliances, status, quotation_amount, lost_reason, temperature)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
        [
          companyId, data.assignee.id, data.name,
          '+92 3' + String(10000000 + Math.floor(Math.random() * 89999999)).substring(0, 9),
          data.city, data.consumption, data.type, 1200,
          500000, 2000000, data.type !== 'on_grid',
          '2 AC, Fridge, Washer, Water Pump',
          data.status, data.quote || null, data.lost_reason || null, temperature
        ]
      );

      // Add activity log
      await db.query(
        `INSERT INTO lead_activities (lead_id, user_id, activity_type, description)
         VALUES ($1, $2, 'created', 'Lead created in seed data')`,
        [result.rows[0].id, data.assignee.id]
      );
    }
    console.log('  Leads created:', leadData.length);

    console.log('\n✅ Seed data created successfully!');
    console.log('────────────────────────────────');
    console.log('Company:     SunPeak Solar Solutions');
    console.log('Admin login: admin@sunpeak.pk / admin123');
    console.log('Sales login: sales1@sunpeak.pk / sales123');
    console.log('────────────────────────────────');

    return companyId;
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  }
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}