const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

function verifySignature(req, res, next) {
  if (!APP_SECRET) return next();

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return res.status(401).json({ error: 'Missing signature' });

  const raw = req.rawBody;
  if (!raw) return res.status(401).json({ error: 'Missing raw body' });

  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}

router.get('/', whatsappController.verify);
router.post('/', verifySignature, whatsappController.handleMessage);

module.exports = router;