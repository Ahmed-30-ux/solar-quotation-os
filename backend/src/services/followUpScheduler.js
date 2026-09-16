const pool = require('../config/db');
const { sendMessage } = require('./whatsappService');

class FollowUpScheduler {
  constructor() {
    this.running = false;
    this.interval = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    // Run every 5 minutes
    this.interval = setInterval(() => this.processDue(), 5 * 60 * 1000);
    console.log('Follow-up scheduler started');
    // Run immediately on start
    this.processDue();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    console.log('Follow-up scheduler stopped');
  }

  async processDue() {
    try {
      const due = await pool.query(
        `SELECT f.*, l.customer_phone, l.company_id, l.id as lead_id, l.status as lead_status
         FROM followups f
         JOIN leads l ON f.lead_id = l.id
         WHERE f.status = 'pending'
           AND f.scheduled_at <= NOW()
           AND f.channel = 'whatsapp'
         ORDER BY f.scheduled_at
         LIMIT 20`
      );

      for (const followup of due.rows) {
        await this.sendFollowUp(followup);
      }
    } catch (err) {
      console.error('Follow-up processing error:', err);
    }
  }

  async sendFollowUp(followup) {
    try {
      if (!followup.customer_phone) {
        await pool.query('UPDATE followups SET status = $1 WHERE id = $2',
          ['failed', followup.id]);
        return;
      }

      const sent = await sendMessage(followup.customer_phone, followup.message);
      if (!sent) {
        await pool.query('UPDATE followups SET status = $1 WHERE id = $2', ['failed', followup.id]);
        console.log(`Follow-up skipped for lead ${followup.lead_id}: WhatsApp not configured or send failed`);
        return;
      }

      await pool.query(
        `UPDATE followups SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [followup.id]
      );

      // Update lead
      await pool.query(
        `UPDATE leads SET last_followup_at = NOW(), followup_count = followup_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [followup.lead_id]
      );

      await pool.query(
        `INSERT INTO lead_activities (lead_id, activity_type, description, metadata)
         VALUES ($1, 'auto_followup', $2, $3)`,
        [followup.lead_id, `Automated follow-up sent: ${followup.message.substring(0, 100)}...`,
         JSON.stringify({ followup_id: followup.id })]
      );

      console.log(`Follow-up sent for lead ${followup.lead_id}`);
    } catch (err) {
      console.error(`Follow-up send failed for lead ${followup.lead_id}:`, err.message);
      await pool.query('UPDATE followups SET status = $1 WHERE id = $2', ['failed', followup.id]);
    }
  }

  async scheduleLeadFollowUps(leadId, quotationId) {
    // Cancel any existing pending auto-followups for this lead
    await pool.query(
      `UPDATE followups SET status = 'cancelled'
       WHERE lead_id = $1 AND followup_type = 'auto' AND status = 'pending'`,
      [leadId]
    );

    // Get customer name
    const leadResult = await pool.query('SELECT customer_name FROM leads WHERE id = $1', [leadId]);
    const name = leadResult.rows[0]?.customer_name || null;

    const followupMessages = [
      { day: 1, message: `Hi ${name || 'there'}! Hope you're doing well. Just checking if you had a chance to review your solar proposal. Happy to answer any questions!` },
      { day: 3, message: `Hi ${name || 'there'}! Have you compared the numbers? Your system could save you significantly on your monthly electricity bill. Would you like to go over the details together?` },
      { day: 5, message: `Hi ${name || 'there'}! Quick heads up — we have a batch of panels reserved at current pricing, but prices may adjust soon. Would you like to lock in today's rates?` },
      { day: 7, message: `Hi ${name || 'there'}! Just letting you know your solar quotation is still valid. If you have questions about installation, warranty, or financing, I'm here to help!` },
      { day: 10, message: `Hi ${name || 'there'}! Haven't heard back from you — no pressure! Just wanted to check if you're still considering solar. We also have alternative system sizes if you'd like to explore options within your budget.` },
    ];

    for (const f of followupMessages) {
      await pool.query(
        `INSERT INTO followups (lead_id, quotation_id, followup_type, channel, message, scheduled_at)
         VALUES ($1, $2, 'auto', 'whatsapp', $3, CURRENT_TIMESTAMP + ($4 || ' days')::interval)`,
        [leadId, quotationId, f.message, f.day]
      );
    }
  }
}

module.exports = new FollowUpScheduler();