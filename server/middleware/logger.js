const pool = require('../db/pool');

/**
 * Log an activity to the audit trail
 */
const logActivity = async (userId, action, entityType, entityId, description, ipAddress = null) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, description, ipAddress]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Create a notification for a user
 */
const createNotification = async (userId, title, message, type = 'info', entityType = null, entityId = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, title, message, type, entityType, entityId]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { logActivity, createNotification };
