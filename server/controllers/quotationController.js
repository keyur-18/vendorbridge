const pool = require('../db/pool');
const { logActivity, createNotification } = require('../middleware/logger');

// GET /api/rfqs/:rfqId/quotations
const getQuotations = async (req, res) => {
  try {
    const { rfqId } = req.params;
    let query;
    let params = [rfqId];

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) return res.json({ success: true, data: [] });
      query = `SELECT q.*, v.company_name, v.email as vendor_email, v.rating
               FROM quotations q JOIN vendors v ON q.vendor_id = v.id
               WHERE q.rfq_id = $1 AND q.vendor_id = $2`;
      params.push(vendorResult.rows[0].id);
    } else {
      query = `SELECT q.*, v.company_name, v.email as vendor_email, v.rating
               FROM quotations q JOIN vendors v ON q.vendor_id = v.id
               WHERE q.rfq_id = $1 ORDER BY q.total_amount ASC`;
    }

    const result = await pool.query(query, params);
    
    const quotationsWithItems = await Promise.all(
      result.rows.map(async (q) => {
        const items = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [q.id]);
        return { ...q, items: items.rows };
      })
    );

    res.json({ success: true, data: quotationsWithItems });
  } catch (err) {
    console.error('Get quotations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quotations' });
  }
};

// POST /api/rfqs/:rfqId/quotations
const submitQuotation = async (req, res) => {
  const { rfqId } = req.params;
  const { notes, delivery_days, validity_days = 30, items = [] } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendorResult = await client.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'No vendor profile found for this user' });
    }
    const vendorId = vendorResult.rows[0].id;

    const invited = await client.query(
      'SELECT * FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
      [rfqId, vendorId]
    );
    if (invited.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'You are not invited to this RFQ' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const existing = await client.query(
      'SELECT id FROM quotations WHERE rfq_id = $1 AND vendor_id = $2',
      [rfqId, vendorId]
    );

    let quotationId;
    if (existing.rowCount > 0) {
      quotationId = existing.rows[0].id;
      await client.query(
        `UPDATE quotations SET notes=$1, delivery_days=$2, validity_days=$3, total_amount=$4, status='revised', submitted_at=NOW()
         WHERE id=$5`,
        [notes, delivery_days, validity_days, totalAmount, quotationId]
      );
      await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [quotationId]);
    } else {
      const result = await client.query(
        `INSERT INTO quotations (rfq_id, vendor_id, notes, delivery_days, validity_days, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [rfqId, vendorId, notes, delivery_days, validity_days, totalAmount]
      );
      quotationId = result.rows[0].id;
    }

    for (const item of items) {
      const totalPrice = item.quantity * item.unit_price;
      await client.query(
        `INSERT INTO quotation_items (quotation_id, rfq_item_id, product_name, quantity, unit, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [quotationId, item.rfq_item_id, item.product_name, item.quantity, item.unit, item.unit_price, totalPrice]
      );
    }

    await client.query(
      `UPDATE rfq_vendors SET status = 'quoted' WHERE rfq_id = $1 AND vendor_id = $2`,
      [rfqId, vendorId]
    );

    await client.query('COMMIT');
    await logActivity(req.user.id, 'SUBMIT', 'quotation', quotationId, `Submitted quotation for RFQ ${rfqId}`);

    const officers = await pool.query(`SELECT id FROM users WHERE role = 'procurement_officer'`);
    for (const officer of officers.rows) {
      await createNotification(officer.id, 'New Quotation Received', `A vendor submitted a quotation for your RFQ`, 'info', 'quotation', quotationId);
    }

    res.status(201).json({ success: true, data: { id: quotationId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit quotation error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit quotation' });
  } finally {
    client.release();
  }
};

// GET /api/quotations/:id
const getQuotationById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, v.company_name, v.email as vendor_email, v.phone as vendor_phone,
              v.gst_number, v.rating
       FROM quotations q JOIN vendors v ON q.vendor_id = v.id
       WHERE q.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    const items = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
    res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
  } catch (err) {
    console.error('Get quotation error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quotation' });
  }
};

module.exports = { getQuotations, submitQuotation, getQuotationById };
