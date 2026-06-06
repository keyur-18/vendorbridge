const pool = require('../db/pool');
const { logActivity } = require('../middleware/logger');

// GET /api/purchase-orders
const getPurchaseOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) {
      conditions.push(`po.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const countResult = await pool.query(`SELECT COUNT(*) FROM purchase_orders po ${where}`, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT po.*, v.company_name as vendor_name, v.email as vendor_email,
              r.rfq_number, r.title as rfq_title, u.name as created_by_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.id
       LEFT JOIN rfqs r ON po.rfq_id = r.id
       LEFT JOIN users u ON po.created_by = u.id
       ${where}
       ORDER BY po.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get POs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
  }
};

// GET /api/purchase-orders/:id
const getPOById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, v.company_name, v.email as vendor_email, v.phone as vendor_phone,
              v.address as vendor_address, v.gst_number,
              r.rfq_number, r.title as rfq_title,
              u.name as created_by_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.id
       LEFT JOIN rfqs r ON po.rfq_id = r.id
       LEFT JOIN users u ON po.created_by = u.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [req.params.id]);
    res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
  } catch (err) {
    console.error('Get PO error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase order' });
  }
};

// POST /api/purchase-orders
const createPO = async (req, res) => {
  const { rfq_id, quotation_id, vendor_id, delivery_address, terms, tax_rate = 18, items = [] } = req.body;
  
  if (!vendor_id || items.length === 0) {
    return res.status(400).json({ success: false, message: 'vendor_id and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate PO number
    const countResult = await client.query('SELECT COUNT(*) FROM purchase_orders');
    const count = parseInt(countResult.rows[0].count) + 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = (subtotal * tax_rate) / 100;
    const totalAmount = subtotal + taxAmount;

    const poResult = await client.query(
      `INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, created_by, delivery_address, terms, subtotal, tax_rate, tax_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [poNumber, rfq_id, quotation_id, vendor_id, req.user.id, delivery_address, terms, subtotal, tax_rate, taxAmount, totalAmount]
    );
    const po = poResult.rows[0];

    for (const item of items) {
      const totalPrice = item.quantity * item.unit_price;
      await client.query(
        `INSERT INTO po_items (po_id, product_name, quantity, unit, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [po.id, item.product_name, item.quantity, item.unit, item.unit_price, totalPrice]
      );
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'CREATE', 'purchase_order', po.id, `Generated Purchase Order: ${poNumber}`);
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create PO error:', err);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  } finally {
    client.release();
  }
};

// PUT /api/purchase-orders/:id/status
const updatePOStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'issued', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    await logActivity(req.user.id, 'UPDATE_STATUS', 'purchase_order', req.params.id, `PO status updated to ${status}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update PO status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

module.exports = { getPurchaseOrders, getPOById, createPO, updatePOStatus };
