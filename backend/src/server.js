require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const leadRoutes = require('./routes/leads');
const quotationRoutes = require('./routes/quotations');
const dashboardRoutes = require('./routes/dashboard');
const whatsappRoutes = require('./routes/whatsapp');
const settingsRoutes = require('./routes/settings');

const followUpScheduler = require('./services/followUpScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware — capture raw body BEFORE JSON parsing for webhook signature verification
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built frontend (single-service deploy). Inactive during local dev.
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Solar Quotation OS running on port ${PORT}`);
    followUpScheduler.start();
  });
}

module.exports = app;