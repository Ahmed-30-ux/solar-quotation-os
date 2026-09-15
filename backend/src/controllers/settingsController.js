const pool = require('../config/db');

exports.getCompany = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { name, logo_url, phone, email, address, city, website, gst_number, currency, logo_data, brand_color } = req.body;

    const result = await pool.query(
      `UPDATE companies SET
        name = COALESCE($1, name),
        logo_url = COALESCE($2, logo_url),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        website = COALESCE($7, website),
        gst_number = COALESCE($8, gst_number),
        currency = COALESCE($9, currency),
        logo_data = COALESCE($10, logo_data),
        brand_color = COALESCE($11, brand_color),
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [name, logo_url, phone, email, address, city, website, gst_number, currency, logo_data, brand_color, req.user.company_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
};

exports.getPricingRules = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_rules WHERE company_id = $1',
      [req.user.company_id]
    );
    const rules = {};
    result.rows.forEach(r => {
      rules[r.rule_key] = JSON.parse(r.rule_value);
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
};

exports.updatePricingRules = async (req, res) => {
  try {
    const rules = req.body; // { margin_percentage: 10, tax_percentage: 17, ... }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(rules)) {
        const exists = await client.query(
          'SELECT id FROM pricing_rules WHERE company_id = $1 AND rule_key = $2',
          [req.user.company_id, key]
        );

        if (exists.rows.length > 0) {
          await client.query(
            'UPDATE pricing_rules SET rule_value = $1, updated_at = NOW() WHERE company_id = $2 AND rule_key = $3',
            [JSON.stringify(value), req.user.company_id, key]
          );
        } else {
          await client.query(
            'INSERT INTO pricing_rules (company_id, rule_key, rule_value) VALUES ($1, $2, $3)',
            [req.user.company_id, key, JSON.stringify(value)]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Pricing rules updated' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pricing rules' });
  }
};

exports.getAllSizingRules = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sizing_rules WHERE company_id = $1 ORDER BY priority',
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sizing rules' });
  }
};

exports.upsertSizingRules = async (req, res) => {
  try {
    const rules = req.body; // array of sizing rules

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing
      await client.query('DELETE FROM sizing_rules WHERE company_id = $1', [req.user.company_id]);

      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        await client.query(
          `INSERT INTO sizing_rules (company_id, name, min_consumption, max_consumption, recommended_system_kw, system_type, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.user.company_id, r.name, r.min_consumption, r.max_consumption, r.recommended_system_kw, r.system_type, i]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Sizing rules updated' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sizing rules' });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM quotation_templates WHERE company_id = $1
       ORDER BY is_default DESC, created_at DESC LIMIT 1`,
      [req.user.company_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { name, header_text, footer_text, terms_conditions, validity_days } = req.body;

    const existing = await pool.query(
      'SELECT id FROM quotation_templates WHERE company_id = $1 LIMIT 1',
      [req.user.company_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE quotation_templates SET
          name = COALESCE($1, name),
          header_text = COALESCE($2, header_text),
          footer_text = COALESCE($3, footer_text),
          terms_conditions = COALESCE($4, terms_conditions),
          validity_days = COALESCE($5, validity_days),
          updated_at = NOW()
         WHERE id = $6 AND company_id = $7 RETURNING *`,
        [name, header_text, footer_text, terms_conditions, validity_days, existing.rows[0].id, req.user.company_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO quotation_templates (company_id, name, header_text, footer_text, terms_conditions, validity_days, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
        [req.user.company_id, name || 'Default Template', header_text, footer_text, terms_conditions, validity_days || 15]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, is_active, created_at
       FROM users WHERE company_id = $1 AND role = 'salesperson'`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const bcrypt = require('bcryptjs');

    const passwordHash = await bcrypt.hash(password || 'password123', 12);
    const result = await pool.query(
      `INSERT INTO users (company_id, name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'salesperson') RETURNING id, name, email, phone, role`,
      [req.user.company_id, name, email, phone || null, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add team member' });
  }
};

exports.getFollowups = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, l.customer_name, l.customer_phone
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE l.company_id = $1
       ORDER BY f.scheduled_at DESC
       LIMIT 50`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch followups' });
  }
};