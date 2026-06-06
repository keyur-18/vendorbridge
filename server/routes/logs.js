const express = require('express');
const router = express.Router();
const { getActivityLogs, getNotifications, markNotificationRead, markAllRead } = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/activity-logs', getActivityLogs);
router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markAllRead);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
