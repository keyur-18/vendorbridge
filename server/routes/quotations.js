const express = require('express');
const router = express.Router();
const { getQuotationById } = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:id', getQuotationById);

module.exports = router;
