const pool = require('./db');

const statements = [
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, logo_url TEXT, phone TEXT,
    email TEXT, address TEXT, city TEXT, website TEXT, gst_number TEXT,
    logo_data TEXT, brand_color TEXT DEFAULT '#f59e0b',
    currency TEXT DEFAULT 'PKR', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    phone TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'salesperson',
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, category_id TEXT, name TEXT NOT NULL,
    brand TEXT, model TEXT, description TEXT, unit TEXT DEFAULT 'piece',
    unit_price REAL NOT NULL DEFAULT 0, cost_price REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT true, specs TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, rule_key TEXT NOT NULL,
    rule_value TEXT NOT NULL, description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), product_id TEXT, old_price REAL, new_price REAL NOT NULL,
    changed_by TEXT, reason TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS sizing_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, name TEXT NOT NULL,
    min_consumption REAL, max_consumption REAL, recommended_system_kw REAL,
    system_type TEXT DEFAULT 'hybrid', priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS quotation_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, name TEXT NOT NULL,
    header_text TEXT, footer_text TEXT, terms_conditions TEXT,
    validity_days INTEGER DEFAULT 15, is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, assigned_to TEXT,
    customer_name TEXT, customer_phone TEXT, customer_email TEXT,
    customer_city TEXT, customer_address TEXT, monthly_consumption REAL,
    bill_upload_url TEXT, bill_extracted_data TEXT DEFAULT '{}',
    system_type TEXT, budget_min REAL, budget_max REAL, roof_area REAL,
    battery_required BOOLEAN DEFAULT false, battery_preference TEXT,
    panel_preference TEXT, inverter_preference TEXT, appliances TEXT,
    special_requirements TEXT, status TEXT DEFAULT 'new',
    lead_source TEXT DEFAULT 'whatsapp', temperature TEXT DEFAULT 'cold',
    lost_reason TEXT, quotation_id TEXT, quotation_amount REAL,
    last_followup_at TEXT, next_followup_at TEXT, followup_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS lead_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), lead_id TEXT, user_id TEXT,
    activity_type TEXT NOT NULL, description TEXT, metadata TEXT DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), company_id TEXT, lead_id TEXT, template_id TEXT,
    reference_number TEXT UNIQUE NOT NULL, system_type TEXT NOT NULL,
    system_size_kw REAL NOT NULL, items TEXT NOT NULL DEFAULT '[]',
    equipment_subtotal REAL DEFAULT 0, services_subtotal REAL DEFAULT 0,
    subtotal REAL DEFAULT 0, margin_percentage REAL DEFAULT 0,
    margin_amount REAL DEFAULT 0, tax_percentage REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0,
    total REAL DEFAULT 0, monthly_savings REAL, annual_savings REAL,
    payback_years REAL, status TEXT DEFAULT 'draft',
    valid_until TEXT, notes TEXT, revision_of TEXT, created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id TEXT, product_id TEXT,
    name TEXT NOT NULL, description TEXT, quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'piece', unit_price REAL NOT NULL, total_price REAL NOT NULL,
    item_type TEXT DEFAULT 'equipment', display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), lead_id TEXT, quotation_id TEXT,
    followup_type TEXT NOT NULL, channel TEXT DEFAULT 'whatsapp',
    message TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', response TEXT, response_at TIMESTAMPTZ,
    created_by TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), phone_number TEXT UNIQUE NOT NULL,
    lead_id TEXT, company_id TEXT, conversation_state TEXT DEFAULT 'idle',
    context TEXT DEFAULT '{}', last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quotations_company ON quotations(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_followups_lead ON followups(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number)`,
  `CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id)`,
];

// Column additions for databases created before these columns existed
const alterStatements = [
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_data TEXT`,
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#f59e0b'`,
];

async function migrate() {
  try {
    console.log('Running migrations...');
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    for (const alt of alterStatements) {
      try {
        await pool.query(alt);
      } catch (_) {
        // column already exists — safe to ignore
      }
    }
    console.log(`Migrations completed! (${statements.length} statements)`);
    return statements.length;
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}

module.exports = { migrate, statements };

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
