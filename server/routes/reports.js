const express = require('express');
const router = express.Router();
const { getDashboard, getVendorPerformance, getSpendingSummary, getMonthlyTrends } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/vendor-performance', getVendorPerformance);
router.get('/spending', getSpendingSummary);
router.get('/monthly-trends', getMonthlyTrends);

module.exports = router;
