const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('Warning: JWT_SECRET is not set. Falling back to a development-only secret. Do not use in production.');
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET || 'vendorbridge_dev_fallback');

    const result = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.userId]);
    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET || 'vendorbridge_dev_fallback', { expiresIn: '7d' });
};

module.exports = { authenticate, authorize, generateToken };
