const pool = require('../config/db');

exports.getOverview = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // Lead counts by status
    const leadCounts = await pool.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(quotation_amount), 0) as value
       FROM leads WHERE company_id = $1 GROUP BY status`,
      [companyId]
    );

    // Total pipeline value
    const pipeline = await pool.query(
      `SELECT
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status IN ('bill_uploaded', 'qualifying', 'qualified') THEN 1 ELSE 0 END) as qualifying,
        SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) as quoted,
        SUM(CASE WHEN status IN ('interested', 'negotiating') THEN 1 ELSE 0 END) as negotiating,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
        COALESCE(SUM(CASE WHEN status != 'lost' THEN quotation_amount ELSE 0 END), 0) as pipeline_value,
        COALESCE(SUM(CASE WHEN status = 'won' THEN quotation_amount ELSE 0 END), 0) as won_value
       FROM leads WHERE company_id = $1`,
      [companyId]
    );

    // Recent activity
    const recentActivity = await pool.query(
      `SELECT la.*, l.customer_name, u.name as user_name
       FROM lead_activities la
       JOIN leads l ON la.lead_id = l.id
       LEFT JOIN users u ON la.user_id = u.id
       WHERE l.company_id = $1
       ORDER BY la.created_at DESC
       LIMIT 10`,
      [companyId]
    );

    // This month's stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthStats = await pool.query(
      `SELECT
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
        COALESCE(SUM(CASE WHEN status = 'won' THEN quotation_amount ELSE 0 END), 0) as revenue,
        SUM(CASE WHEN created_at >= $2 THEN 1 ELSE 0 END) as new_this_month
       FROM leads WHERE company_id = $1`,
      [companyId, monthStart]
    );

    // Quotation stats
    const quoteStats = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
       FROM quotations WHERE company_id = $1`,
      [companyId]
    );

    res.json({
      leads: leadCounts.rows,
      pipeline: pipeline.rows[0],
      recent_activity: recentActivity.rows,
      month_stats: monthStats.rows[0],
      quotation_stats: quoteStats.rows[0],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

exports.getTeamPerformance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id, u.name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status = 'quoted' THEN 1 ELSE 0 END) as quoted,
        SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) as won,
        COALESCE(SUM(CASE WHEN l.status = 'won' THEN l.quotation_amount ELSE 0 END), 0) as revenue,
        CASE WHEN COUNT(l.id) > 0
          THEN ROUND(SUM(CASE WHEN l.status = 'won' THEN 1.0 ELSE 0 END) / COUNT(l.id) * 100, 1)
          ELSE 0
        END as conversion_rate
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
       WHERE u.company_id = $1 AND u.role = 'salesperson'
       GROUP BY u.id, u.name
       ORDER BY revenue DESC`,
      [req.user.company_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team performance' });
  }
};
