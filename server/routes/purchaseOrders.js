const express = require('express');
const router = express.Router();
const { getPurchaseOrders, getPOById, createPO, updatePOStatus, downloadPOPDF, sendPOEmail } = require('../controllers/poController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getPurchaseOrders);
router.post('/', authorize('admin', 'procurement_officer'), createPO);
router.get('/:id', getPOById);
router.get('/:id/pdf', downloadPOPDF);
router.post('/:id/send-email', authorize('admin', 'procurement_officer'), sendPOEmail);
router.put('/:id/status', authorize('admin', 'procurement_officer', 'manager'), updatePOStatus);

module.exports = router;
