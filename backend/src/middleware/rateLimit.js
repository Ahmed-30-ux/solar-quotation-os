const crypto = require('crypto');

function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map();

  function sweep() {
    const now = Date.now();
    for (const [key, rec] of hits) {
      if (now - rec.resetAt > 0) hits.delete(key);
    }
  }
  setInterval(sweep, windowMs).unref();

  return (req, res, next) => {
    const key = crypto
      .createHash('sha256')
      .update((req.ip || req.socket.remoteAddress || 'unknown') + (req.user ? req.user.id : ''))
      .digest('hex')
      .slice(0, 16);

    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
    }
    rec.count++;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));

    if (rec.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { rateLimit };