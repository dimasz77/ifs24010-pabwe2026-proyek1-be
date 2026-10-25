const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

function createApp({ db, config }) {
  const app = express();
  app.locals.db = db;
  app.locals.config = config;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', routes);
  app.use('/api', (req, res) =>
    res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Endpoint ${req.method} ${req.originalUrl} tidak ada` } }));

  app.use((req, res) =>
    res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Halaman tidak ditemukan' } }));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
