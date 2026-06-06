const pool = require('../db/pool');
const { logActivity } = require('../middleware/logger');

// GET /api/vendors
const getVendors = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(v.company_name ILIKE $${idx} OR v.email ILIKE $${idx} OR v.contact_person ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`v.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (status) {
      conditions.push(`v.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM vendors v ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT v.*, u.name as user_name FROM vendors v
       LEFT JOIN users u ON v.user_id = u.id
       ${where}
       ORDER BY v.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get vendors error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
  }
};

// GET /api/vendors/:id
const getVendorById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.name as user_name FROM vendors v
       LEFT JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get vendor error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor' });
  }
};

// POST /api/vendors
const createVendor = async (req, res) => {
  const { company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, notes } = req.body;
  
  if (!company_name || !email) {
    return res.status(400).json({ success: false, message: 'Company name and email are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vendors (company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, notes]
    );
    
    await logActivity(req.user.id, 'CREATE', 'vendor', result.rows[0].id, `Created vendor: ${company_name}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create vendor error:', err);
    res.status(500).json({ success: false, message: 'Failed to create vendor' });
  }
};

// PUT /api/vendors/:id
const updateVendor = async (req, res) => {
  const { company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, status, notes } = req.body;

  try {
    const result = await pool.query(
      `UPDATE vendors SET 
        company_name = COALESCE($1, company_name),
        category = COALESCE($2, category),
        gst_number = COALESCE($3, gst_number),
        contact_person = COALESCE($4, contact_person),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        pincode = COALESCE($10, pincode),
        status = COALESCE($11, status),
        notes = COALESCE($12, notes)
       WHERE id = $13
       RETURNING *`,
      [company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, status, notes, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await logActivity(req.user.id, 'UPDATE', 'vendor', req.params.id, `Updated vendor: ${company_name}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update vendor error:', err);
    res.status(500).json({ success: false, message: 'Failed to update vendor' });
  }
};

// DELETE /api/vendors/:id
const deleteVendor = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING id, company_name', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    await logActivity(req.user.id, 'DELETE', 'vendor', req.params.id, `Deleted vendor: ${result.rows[0].company_name}`);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error('Delete vendor error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete vendor' });
  }
};

// GET /api/vendors/categories
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`SELECT DISTINCT category FROM vendors WHERE category IS NOT NULL ORDER BY category`);
    res.json({ success: true, data: result.rows.map(r => r.category) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

module.exports = { getVendors, getVendorById, createVendor, updateVendor, deleteVendor, getCategories };
