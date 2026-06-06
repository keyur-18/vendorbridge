const express = require('express');
const router = express.Router();
const { getRFQs, getRFQById, createRFQ, updateRFQ, inviteVendors } = require('../controllers/rfqController');
const { getQuotations, submitQuotation } = require('../controllers/quotationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getRFQs);
router.post('/', authorize('admin', 'procurement_officer'), createRFQ);
router.get('/:id', getRFQById);
router.put('/:id', authorize('admin', 'procurement_officer'), updateRFQ);
router.post('/:id/invite', authorize('admin', 'procurement_officer'), inviteVendors);

router.get('/:rfqId/quotations', getQuotations);
router.post('/:rfqId/quotations', authorize('vendor'), submitQuotation);

module.exports = router;
