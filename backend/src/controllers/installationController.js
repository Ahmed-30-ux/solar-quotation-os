const pool = require('../config/db');

const TABLE_EXISTS_SQL = `
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'installations'
  )
`;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS installations (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    system_size NUMERIC(10,2),
    system_type VARCHAR(20) DEFAULT 'on_grid',
    panel_count INTEGER,
    inverter_model VARCHAR(255),
    battery_spec VARCHAR(255),
    scheduled_date DATE,
    team_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'scheduled',
    checklist JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`;

async function ensureTable() {
  try {
    const exists = await pool.query(TABLE_EXISTS_SQL);
    if (!exists.rows[0].exists) {
      await pool.query(CREATE_TABLE_SQL);
    }
  } catch {
    // If DB is unavailable or query fails, routes will handle gracefully
  }
}

ensureTable();

exports.listInstallations = async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM installations';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    if (err.code === '42P01') {
      return res.json([]);
    }
    console.error('Error listing installations:', err);
    res.status(500).json({ error: 'Failed to list installations' });
  }
};

exports.getInstallation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM installations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(404).json({ error: 'Installation not found' });
    }
    console.error('Error getting installation:', err);
    res.status(500).json({ error: 'Failed to get installation' });
  }
};

exports.createInstallation = async (req, res) => {
  try {
    const {
      lead_id,
      system_size,
      system_type,
      scheduled_date,
      team_name,
      notes,
    } = req.body;

    if (!lead_id || !system_size || !scheduled_date) {
      return res.status(400).json({ error: 'lead_id, system_size, and scheduled_date are required' });
    }

    // Fetch lead details to populate customer fields
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';
    let customerAddress = '';

    try {
      const leadResult = await pool.query(
        'SELECT name, email, phone, address FROM leads WHERE id = $1',
        [lead_id]
      );
      if (leadResult.rows.length > 0) {
        const lead = leadResult.rows[0];
        customerName = lead.name || '';
        customerEmail = lead.email || '';
        customerPhone = lead.phone || '';
        customerAddress = lead.address || '';
      }
    } catch {
      // leads table may not exist, continue with empty values
    }

    const result = await pool.query(
      `INSERT INTO installations
        (lead_id, customer_name, customer_email, customer_phone, customer_address,
         system_size, system_type, scheduled_date, team_name, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)
       RETURNING *`,
      [lead_id, customerName, customerEmail, customerPhone, customerAddress,
       system_size, system_type || 'on_grid', scheduled_date, team_name || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(500).json({ error: 'Installations table does not exist. Please run migrations.' });
    }
    console.error('Error creating installation:', err);
    res.status(500).json({ error: 'Failed to create installation' });
  }
};

exports.updateInstallation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, team_name, scheduled_date, notes, system_size, system_type } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    if (team_name !== undefined) { fields.push(`team_name = $${idx++}`); values.push(team_name); }
    if (scheduled_date !== undefined) { fields.push(`scheduled_date = $${idx++}`); values.push(scheduled_date); }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes); }
    if (system_size !== undefined) { fields.push(`system_size = $${idx++}`); values.push(system_size); }
    if (system_type !== undefined) { fields.push(`system_type = $${idx++}`); values.push(system_type); }

    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE installations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(404).json({ error: 'Installation not found' });
    }
    console.error('Error updating installation:', err);
    res.status(500).json({ error: 'Failed to update installation' });
  }
};

exports.updateChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist } = req.body;

    if (!Array.isArray(checklist)) {
      return res.status(400).json({ error: 'checklist must be an array' });
    }

    const result = await pool.query(
      `UPDATE installations SET checklist = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(checklist), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(404).json({ error: 'Installation not found' });
    }
    console.error('Error updating checklist:', err);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
};
