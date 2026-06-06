const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { generateToken } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, role = 'procurement_officer' } = req.body;

  // Validate
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  // Allow users to register with any role
  const allowedRoles = ['procurement_officer', 'vendor', 'manager', 'admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role or registration for this role is restricted' });
  }

  try {
    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );

    const user = result.rows[0];
    
    // Automatically link or create vendor profile for vendor users
    if (role === 'vendor') {
      const existingVendor = await pool.query('SELECT id FROM vendors WHERE email = $1', [email]);
      if (existingVendor.rowCount > 0) {
        await pool.query('UPDATE vendors SET user_id = $1 WHERE id = $2', [user.id, existingVendor.rows[0].id]);
      } else {
        await pool.query(
          `INSERT INTO vendors (user_id, company_name, email, contact_person, status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [user.id, name, email, name]
        );
      }
    }

    const token = generateToken(user.id);

    await logActivity(user.id, 'REGISTER', 'user', user.id, `User registered: ${email}`);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    
    await logActivity(user.id, 'LOGIN', 'user', user.id, `User logged in: ${email}`, req.ip);

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  // Mock response - in production would send email with reset link
  res.json({ success: true, message: 'If this email is registered, a reset link will be sent' });
};

// GET /api/auth/managers
const getManagers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE role = \'manager\' AND is_active = true ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get managers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch managers' });
  }
};

module.exports = { register, login, getMe, forgotPassword, getManagers };
