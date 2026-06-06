const pool = require('../db/pool');
const { logActivity, createNotification } = require('../middleware/logger');

// GET /api/rfqs
const getRFQs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) {
        return res.json({ success: true, data: [], total: 0 });
      }
      const vendorId = vendorResult.rows[0].id;
      conditions.push(`EXISTS (SELECT 1 FROM rfq_vendors rv WHERE rv.rfq_id = r.id AND rv.vendor_id = $${idx})`);
      params.push(vendorId);
      idx++;
    }

    if (status) {
      conditions.push(`r.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (search) {
      conditions.push(`(r.title ILIKE $${idx} OR r.rfq_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM rfqs r ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT r.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM rfq_vendors rv WHERE rv.rfq_id = r.id) as vendor_count,
        (SELECT COUNT(*) FROM quotations q WHERE q.rfq_id = r.id) as quotation_count
       FROM rfqs r
       LEFT JOIN users u ON r.created_by = u.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get RFQs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch RFQs' });
  }
};

// GET /api/rfqs/:id
const getRFQById = async (req, res) => {
  try {
    let vendorId = null;
    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) {
        return res.status(403).json({ success: false, message: 'Vendor profile not found' });
      }
      vendorId = vendorResult.rows[0].id;
      const inviteCheck = await pool.query(
        'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
        [req.params.id, vendorId]
      );
      if (inviteCheck.rowCount === 0) {
        return res.status(403).json({ success: false, message: 'You are not invited to this RFQ' });
      }
    }

    const rfqResult = await pool.query(
      `SELECT r.*, u.name as created_by_name FROM rfqs r
       LEFT JOIN users u ON r.created_by = u.id WHERE r.id = $1`,
      [req.params.id]
    );
    if (rfqResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    const items = await pool.query('SELECT * FROM rfq_items WHERE rfq_id = $1', [req.params.id]);
    const vendors = await pool.query(
      `SELECT rv.*, v.company_name, v.email, v.contact_person, v.rating
       FROM rfq_vendors rv JOIN vendors v ON rv.vendor_id = v.id
       WHERE rv.rfq_id = $1`,
      [req.params.id]
    );

    let vendorsList = vendors.rows;
    if (req.user.role === 'vendor') {
      vendorsList = vendorsList.filter(v => v.vendor_id === vendorId);
    }

    res.json({
      success: true,
      data: { ...rfqResult.rows[0], items: items.rows, vendors: vendorsList }
    });
  } catch (err) {
    console.error('Get RFQ error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch RFQ' });
  }
};

// POST /api/rfqs
const createRFQ = async (req, res) => {
  const { title, description, deadline, items = [], vendor_ids = [] } = req.body;
  
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const countResult = await client.query('SELECT COUNT(*) FROM rfqs');
    const count = parseInt(countResult.rows[0].count) + 1;
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const rfqResult = await client.query(
      `INSERT INTO rfqs (rfq_number, title, description, created_by, deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rfqNumber, title, description, req.user.id, deadline, vendor_ids.length > 0 ? 'open' : 'draft']
    );
    const rfq = rfqResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications)
         VALUES ($1, $2, $3, $4, $5)`,
        [rfq.id, item.product_name, item.quantity, item.unit, item.specifications]
      );
    }

    for (const vendorId of vendor_ids) {
      await client.query(
        `INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rfq.id, vendorId]
      );
      const vendorUser = await client.query('SELECT user_id FROM vendors WHERE id = $1', [vendorId]);
      if (vendorUser.rowCount > 0 && vendorUser.rows[0].user_id) {
        await createNotification(
          vendorUser.rows[0].user_id,
          'New RFQ Invitation',
          `You have been invited to quote for ${rfqNumber}: ${title}`,
          'rfq', 'rfq', rfq.id
        );
      }
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE', 'rfq', rfq.id, `Created RFQ: ${rfqNumber} - ${title}`);
    res.status(201).json({ success: true, data: rfq });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create RFQ error:', err);
    res.status(500).json({ success: false, message: 'Failed to create RFQ' });
  } finally {
    client.release();
  }
};

// PUT /api/rfqs/:id
const updateRFQ = async (req, res) => {
  const { title, description, deadline, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rfqs SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        deadline = COALESCE($3, deadline),
        status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [title, description, deadline, status, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }
    await logActivity(req.user.id, 'UPDATE', 'rfq', req.params.id, `Updated RFQ: ${title}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update RFQ error:', err);
    res.status(500).json({ success: false, message: 'Failed to update RFQ' });
  }
};

// POST /api/rfqs/:id/invite
const inviteVendors = async (req, res) => {
  const { vendor_ids } = req.body;
  if (!vendor_ids || !vendor_ids.length) {
    return res.status(400).json({ success: false, message: 'vendor_ids array is required' });
  }

  try {
    const rfq = await pool.query('SELECT * FROM rfqs WHERE id = $1', [req.params.id]);
    if (rfq.rowCount === 0) return res.status(404).json({ success: false, message: 'RFQ not found' });

    for (const vendorId of vendor_ids) {
      await pool.query(
        `INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.params.id, vendorId]
      );
    }

    await pool.query(`UPDATE rfqs SET status = 'open' WHERE id = $1 AND status = 'draft'`, [req.params.id]);
    await logActivity(req.user.id, 'INVITE', 'rfq', req.params.id, `Invited ${vendor_ids.length} vendors`);
    res.json({ success: true, message: `Invited ${vendor_ids.length} vendors` });
  } catch (err) {
    console.error('Invite vendors error:', err);
    res.status(500).json({ success: false, message: 'Failed to invite vendors' });
  }
};

module.exports = { getRFQs, getRFQById, createRFQ, updateRFQ, inviteVendors };
