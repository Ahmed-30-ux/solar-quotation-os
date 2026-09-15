const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { status, assigned_to, search, temperature } = req.query;
    let query = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.company_id = $1
    `;
    const params = [req.user.company_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND l.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    if (temperature) {
      paramCount++;
      query += ` AND l.temperature = $${paramCount}`;
      params.push(temperature);
    }

    if (search) {
      paramCount++;
      query += ` AND (l.customer_name LIKE $${paramCount} OR l.customer_phone LIKE $${paramCount} OR l.customer_email LIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

exports.getById = async (req, res) => {
  try {
    const leadResult = await pool.query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1 AND l.company_id = $2`,
      [req.params.id, req.user.company_id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const activities = await pool.query(
      `SELECT la.*, u.name as user_name
       FROM lead_activities la
       LEFT JOIN users u ON la.user_id = u.id
       WHERE la.lead_id = $1
       ORDER BY la.created_at DESC`,
      [req.params.id]
    );

    const quotations = await pool.query(
      `SELECT * FROM quotations WHERE lead_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );

    const followups = await pool.query(
      `SELECT * FROM followups WHERE lead_id = $1 ORDER BY scheduled_at DESC`,
      [req.params.id]
    );

    res.json({
      ...leadResult.rows[0],
      activities: activities.rows,
      quotations: quotations.rows,
      followups: followups.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_email, customer_city,
      monthly_consumption, system_type, budget_min, budget_max,
      roof_area, battery_required, appliances, lead_source
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (
        company_id, customer_name, customer_phone, customer_email, customer_city,
        monthly_consumption, system_type, budget_min, budget_max,
        roof_area, battery_required, appliances, lead_source, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        req.user.company_id, customer_name, customer_phone, customer_email, customer_city,
        monthly_consumption, system_type, budget_min, budget_max,
        roof_area, battery_required, appliances, lead_source || 'manual', 'new'
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO lead_activities (lead_id, user_id, activity_type, description)
       VALUES ($1, $2, 'created', 'Lead created')`,
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = [
      'customer_name', 'customer_phone', 'customer_email', 'customer_city',
      'customer_address', 'monthly_consumption', 'system_type', 'budget_min',
      'budget_max', 'roof_area', 'battery_required', 'battery_preference',
      'panel_preference', 'inverter_preference', 'appliances', 'special_requirements',
      'status', 'assigned_to', 'temperature', 'lost_reason', 'quotation_id', 'quotation_amount'
    ];

    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    values.push(req.user.company_id);

    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Log status change
    if (req.body.status) {
      await pool.query(
        `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, metadata)
         VALUES ($1, $2, 'status_changed', $3, $4)`,
        [req.params.id, req.user.id, `Status changed to ${req.body.status}`, JSON.stringify({ new_status: req.body.status })]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { activity_type, description, metadata } = req.body;

    const result = await pool.query(
      `INSERT INTO lead_activities (lead_id, user_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, activity_type, description, JSON.stringify(metadata || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add activity' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(quotation_amount), 0) as total_value
       FROM leads
       WHERE company_id = $1
       GROUP BY status`,
      [req.user.company_id]
    );

    const byTemperature = await pool.query(
      `SELECT temperature, COUNT(*) as count
       FROM leads WHERE company_id = $1 GROUP BY temperature`,
      [req.user.company_id]
    );

    const byAssignee = await pool.query(
      `SELECT u.name, l.assigned_to,
        COUNT(*) as total_leads,
        SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN l.status IN ('quoted', 'interested', 'negotiating') THEN 1 ELSE 0 END) as in_pipeline,
        COALESCE(SUM(CASE WHEN l.status = 'won' THEN l.quotation_amount ELSE 0 END), 0) as revenue
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.company_id = $1
       GROUP BY l.assigned_to, u.name`,
      [req.user.company_id]
    );

    res.json({
      by_status: stats.rows,
      by_temperature: byTemperature.rows,
      by_assignee: byAssignee.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
