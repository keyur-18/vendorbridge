const pool = require('../db/pool');

// GET /api/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, entity_type } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (entity_type) {
      conditions.push(`al.entity_type = $${idx}`);
      params.push(entity_type);
      idx++;
    }

    // Non-admins only see their own logs
    if (req.user.role !== 'admin') {
      conditions.push(`al.user_id = $${idx}`);
      params.push(req.user.id);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM activity_logs al ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role
       FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get activity logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    res.json({ success: true, data: result.rows, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// PUT /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

module.exports = { getActivityLogs, getNotifications, markNotificationRead, markAllRead };
