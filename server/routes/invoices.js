const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceById, createInvoice, downloadInvoicePDF, sendInvoiceEmail, updateInvoiceStatus } = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getInvoices);
router.post('/', authorize('admin', 'procurement_officer'), createInvoice);
router.get('/:id', getInvoiceById);
router.get('/:id/pdf', downloadInvoicePDF);
router.post('/:id/send-email', authorize('admin', 'procurement_officer'), sendInvoiceEmail);
router.put('/:id/status', authorize('admin', 'procurement_officer', 'manager'), updateInvoiceStatus);

module.exports = router;
