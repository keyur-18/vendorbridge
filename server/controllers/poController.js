const pool = require('../db/pool');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { logActivity } = require('../middleware/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// GET /api/purchase-orders
const getPurchaseOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
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
      conditions.push(`po.vendor_id = $${idx}`);
      params.push(vendorId);
      idx++;
    }

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

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this purchase order does not belong to you' });
      }
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

const generatePOPDFBuffer = (po, items) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header Info (Left)
      doc.fontSize(22).fillColor('#0F766E').font('Helvetica-Bold').text('VendorBridge', 50, 50);
      doc.fontSize(9).fillColor('#64748B').font('Helvetica').text('Procurement & Vendor Management ERP', 50, 75);

      // PO Header Metadata (Right)
      doc.fontSize(20).fillColor('#1E293B').font('Helvetica-Bold').text('PURCHASE ORDER', 350, 50, { align: 'right', width: 200 });
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(`PO #: ${po.po_number}`, 350, 75, { align: 'right', width: 200 });
      doc.text(`RFQ #: ${po.rfq_number || '—'}`, 350, 90, { align: 'right', width: 200 });
      doc.text(`Date: ${new Date(po.created_at).toLocaleDateString('en-IN')}`, 350, 105, { align: 'right', width: 200 });
      doc.text(`Status: ${po.status.toUpperCase()}`, 350, 120, { align: 'right', width: 200 });

      // Clean horizontal divider line
      doc.moveTo(50, 145).lineTo(550, 145).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Vendor Info (Left) & Delivery To (Right) Grid
      const infoY = 160;
      doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('VENDOR:', 50, infoY);
      doc.fontSize(11).fillColor('#1E293B').font('Helvetica-Bold').text(po.company_name, 50, infoY + 15);
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(po.vendor_address || '', 50, infoY + 30, { width: 230 });
      doc.text(`Email: ${po.vendor_email || ''}`, 50, infoY + 60, { width: 230 });
      if (po.gst_number) {
        doc.text(`GSTIN: ${po.gst_number}`, 50, infoY + 75, { width: 230 });
      }

      doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('SHIP TO / DELIVERY:', 300, infoY);
      doc.fontSize(11).fillColor('#1E293B').font('Helvetica-Bold').text('VendorBridge Corp', 300, infoY + 15);
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(po.delivery_address || 'Company Headquarters Address', 300, infoY + 30, { width: 250 });

      // Clean horizontal divider line
      doc.moveTo(50, 260).lineTo(550, 260).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Table Header
      const tableTop = 275;
      doc.fillColor('#0F766E').rect(50, tableTop, 500, 22).fill();
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Product Description', 60, tableTop + 6);
      doc.text('Qty', 280, tableTop + 6, { width: 40, align: 'right' });
      doc.text('Unit Price', 330, tableTop + 6, { width: 90, align: 'right' });
      doc.text('Total', 440, tableTop + 6, { width: 100, align: 'right' });

      // Table Rows
      let y = tableTop + 22;
      items.forEach((item, i) => {
        if (i % 2 === 0) {
          doc.fillColor('#F8FAFC').rect(50, y, 500, 20).fill();
        }
        doc.fillColor('#1E293B').fontSize(9).font('Helvetica');
        doc.text(item.product_name, 60, y + 5);
        doc.text(String(item.quantity), 280, y + 5, { width: 40, align: 'right' });
        doc.text(`INR ${Number(item.unit_price).toLocaleString('en-IN')}`, 330, y + 5, { width: 90, align: 'right' });
        doc.text(`INR ${Number(item.total_price).toLocaleString('en-IN')}`, 440, y + 5, { width: 100, align: 'right' });
        y += 20;
      });

      // Divider line below table
      y += 10;
      doc.moveTo(50, y).lineTo(550, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
      y += 15;

      // Totals Section
      doc.fontSize(9).fillColor('#64748B').font('Helvetica');
      doc.text('Subtotal:', 340, y, { width: 100, align: 'right' });
      doc.fontSize(9).fillColor('#1E293B').font('Helvetica-Bold').text(`INR ${Number(po.subtotal).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });
      
      y += 18;
      doc.fontSize(9).fillColor('#64748B').font('Helvetica').text(`Tax (${po.tax_rate}%):`, 340, y, { width: 100, align: 'right' });
      doc.fontSize(9).fillColor('#1E293B').font('Helvetica-Bold').text(`INR ${Number(po.tax_amount).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });
      
      y += 18;
      doc.moveTo(340, y).lineTo(550, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
      y += 8;

      doc.fontSize(11).fillColor('#0F766E').font('Helvetica-Bold').text('TOTAL:', 340, y, { width: 100, align: 'right' });
      doc.fontSize(11).fillColor('#0F766E').font('Helvetica-Bold').text(`INR ${Number(po.total_amount).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });

      // Terms & Conditions section if present
      if (po.terms) {
        y += 35;
        if (y < 680) {
          doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('TERMS & CONDITIONS:', 50, y);
          doc.fontSize(8).fillColor('#475569').font('Helvetica').text(po.terms, 50, y + 15, { width: 500 });
        }
      }

      // Footer
      doc.fontSize(8).fillColor('#94A3B8').font('Helvetica').text('Thank you for your business — VendorBridge ERP', 50, 720, { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const downloadPOPDF = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, v.company_name, v.email as vendor_email, v.gst_number, v.address as vendor_address,
              r.rfq_number
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.id
       LEFT JOIN rfqs r ON po.rfq_id = r.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this purchase order does not belong to you' });
      }
    }

    const po = result.rows[0];
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [po.id]);

    const pdfBuffer = await generatePOPDFBuffer(po, items.rows);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${po.po_number}.pdf"`);
    res.send(pdfBuffer);

    await logActivity(req.user.id, 'DOWNLOAD_PDF', 'purchase_order', req.params.id, `Downloaded PDF: ${po.po_number}`);
  } catch (err) {
    console.error('PO PDF generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PO PDF' });
  }
};

const sendPOEmail = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, v.company_name, v.email as vendor_email, v.gst_number, v.address as vendor_address,
              r.rfq_number
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.id
       LEFT JOIN rfqs r ON po.rfq_id = r.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this purchase order does not belong to you' });
      }
    }

    const po = result.rows[0];
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [po.id]);

    const pdfBuffer = await generatePOPDFBuffer(po, items.rows);

    // Update status to issued if it was draft
    if (po.status === 'draft') {
      await pool.query(`UPDATE purchase_orders SET status = 'issued', issued_at = NOW() WHERE id = $1`, [req.params.id]);
    }

    const recipientEmails = [po.vendor_email, req.user.email].filter(Boolean);

    if (process.env.MOCK_EMAIL !== 'true') {
      await transporter.sendMail({
        from: `"VendorBridge System" <${process.env.SMTP_USER}>`,
        to: recipientEmails.join(', '),
        subject: `[VendorBridge] Purchase Order Issued: ${po.po_number}`,
        text: `Dear ${po.company_name},

Please find attached the Purchase Order ${po.po_number} issued by VendorBridge.

Purchase Order Details:
- PO Number: ${po.po_number}
- RFQ Number: ${po.rfq_number || '—'}
- Date: ${new Date(po.created_at).toLocaleDateString('en-IN')}
- Total Amount: INR ${Number(po.total_amount).toLocaleString('en-IN')}

Please review the attached PDF and fulfill the order details.

This purchase order was sent to you by ${req.user.name} (${req.user.email}).

Regards,
VendorBridge ERP`,
        attachments: [
          {
            filename: `${po.po_number}.pdf`,
            content: pdfBuffer,
          }
        ]
      });
    }

    await logActivity(req.user.id, 'SEND_EMAIL', 'purchase_order', req.params.id, `Sent PO email to ${recipientEmails.join(', ')}: ${po.po_number}`);
    res.json({ success: true, message: `PO email successfully sent to ${recipientEmails.join(', ')}` });
  } catch (err) {
    console.error('Send PO email error:', err);
    res.status(500).json({ success: false, message: 'Failed to send PO email' });
  }
};

module.exports = { getPurchaseOrders, getPOById, createPO, updatePOStatus, downloadPOPDF, sendPOEmail };
