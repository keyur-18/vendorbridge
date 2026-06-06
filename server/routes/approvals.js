const express = require('express');
const router = express.Router();
const { getApprovals, createApproval, actOnApproval, getApprovalById } = require('../controllers/approvalController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getApprovals);
router.post('/', authorize('admin', 'procurement_officer'), createApproval);
router.get('/:id', getApprovalById);
router.put('/:id', authorize('admin', 'manager'), actOnApproval);

module.exports = router;
