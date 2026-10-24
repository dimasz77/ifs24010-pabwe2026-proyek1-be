const { Router } = require('express');
const locations = require('../controllers/locationController');
const motors = require('../controllers/motorcycleController');
const customers = require('../controllers/customerController');
const rentals = require('../controllers/rentalController');
const dashboard = require('../controllers/dashboardController');
const auth = require('../controllers/authController');
const requireAuth = require('../middleware/auth');

const router = Router();

router.get('/health', (req, res) => {
  try {
    req.app.locals.db.prepare('SELECT 1').get();
    res.json({ success: true, data: { status: 'ok', database: 'connected', time: new Date().toISOString() } });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Database tidak dapat diakses' } });
  }
});

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// Semua endpoint di bawah ini wajib login
router.use(requireAuth);
router.get('/auth/me', auth.me);

router.get('/dashboard/summary', dashboard.summary);
router.get('/locations', locations.list);

router.get('/motorcycles', motors.list);
router.post('/motorcycles', motors.create);
router.get('/motorcycles/:id', motors.get);
router.put('/motorcycles/:id', motors.update);
router.delete('/motorcycles/:id', motors.remove);

router.get('/customers', customers.list);
router.post('/customers', customers.create);
router.get('/customers/:id', customers.get);
router.put('/customers/:id', customers.update);
router.delete('/customers/:id', customers.remove);

router.get('/rentals', rentals.list);
router.get('/rentals/quote', rentals.quote);
router.post('/rentals', rentals.create);
router.get('/rentals/:id', rentals.get);
router.put('/rentals/:id', rentals.update);
router.patch('/rentals/:id/status', rentals.changeStatus);
router.delete('/rentals/:id', rentals.remove);

module.exports = router;
