const express = require('express');
const router = express.Router();
const { getVendors, getVendorById, createVendor, updateVendor, deleteVendor, getCategories } = require('../controllers/vendorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/categories', getCategories);
router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', authorize('admin', 'procurement_officer'), createVendor);
router.put('/:id', authorize('admin', 'procurement_officer'), updateVendor);
router.delete('/:id', authorize('admin'), deleteVendor);

module.exports = router;
