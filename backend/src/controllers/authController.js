const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { companyName, name, email, phone, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const companyResult = await client.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING id',
        [companyName]
      );
      const companyId = companyResult.rows[0].id;

      const userResult = await client.query(
        'INSERT INTO users (company_id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, company_id, name, email, role',
        [companyId, name, email, phone || null, passwordHash, 'admin']
      );
      const user = userResult.rows[0];

      // Create default product categories
      const categories = ['Solar Panels', 'Inverters', 'Batteries', 'Accessories', 'Services'];
      for (let i = 0; i < categories.length; i++) {
        await client.query(
          'INSERT INTO product_categories (company_id, name, display_order) VALUES ($1, $2, $3)',
          [companyId, categories[i], i]
        );
      }

      // Create default pricing rules
      const defaultRules = [
        { key: 'margin_percentage', value: 8, desc: 'Company margin %' },
        { key: 'tax_percentage', value: 17, desc: 'GST/Tax %' },
        { key: 'installation_per_kw', value: 10000, desc: 'Installation cost per kW' },
        { key: 'transport_flat', value: 15000, desc: 'Flat transportation cost' },
      ];
      for (const rule of defaultRules) {
        await client.query(
          'INSERT INTO pricing_rules (company_id, rule_key, rule_value, description) VALUES ($1, $2, $3, $4)',
          [companyId, rule.key, JSON.stringify(rule.value), rule.desc]
        );
      }

      // Create default quotation template
      await client.query(
        `INSERT INTO quotation_templates (company_id, name, terms_conditions, validity_days, is_default)
         VALUES ($1, 'Default Template', '1. This quotation is valid for 15 days from the date of issue.\n2. 50% advance payment required to proceed.\n3. Installation will be completed within 3-5 working days after advance payment.\n4. Warranty as per manufacturer policy.\n5. Prices are subject to change after validity period.', 15, true)`,
        [companyId]
      );

      // Create default sizing rules
      const sizingRules = [
        { name: 'Small Home', min: 0, max: 300, kw: 3, type: 'hybrid' },
        { name: 'Medium Home', min: 300, max: 600, kw: 6, type: 'hybrid' },
        { name: 'Large Home', min: 600, max: 1000, kw: 10, type: 'hybrid' },
        { name: 'Commercial', min: 1000, max: 999999, kw: 20, type: 'on_grid' },
      ];
      for (let i = 0; i < sizingRules.length; i++) {
        const s = sizingRules[i];
        await client.query(
          `INSERT INTO sizing_rules (company_id, name, min_consumption, max_consumption, recommended_system_kw, system_type, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [companyId, s.name, s.min, s.max, s.kw, s.type, i]
        );
      }

      await client.query('COMMIT');

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ user, token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT u.*, c.name as company_name FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      user: {
        id: user.id,
        company_id: user.company_id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.company_id, c.name as company_name, c.logo_url
       FROM users u JOIN companies c ON u.company_id = c.id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};
