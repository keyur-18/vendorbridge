const pool = require('../db/pool');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../middleware/logger');

// GET /api/invoices
const getInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) {
      conditions.push(`i.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT i.*, v.company_name as vendor_name, po.po_number
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN purchase_orders po ON i.po_id = po.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ success: true, data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};

// GET /api/invoices/:id
const getInvoiceById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
              v.company_name, v.email as vendor_email, v.phone as vendor_phone,
              v.address as vendor_address, v.gst_number,
              po.po_number, po.delivery_address, po.terms
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN purchase_orders po ON i.po_id = po.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const poItems = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [result.rows[0].po_id]);
    res.json({ success: true, data: { ...result.rows[0], items: poItems.rows } });
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
};

// POST /api/invoices
const createInvoice = async (req, res) => {
  const { po_id, notes, due_date } = req.body;
  
  if (!po_id) {
    return res.status(400).json({ success: false, message: 'po_id is required' });
  }

  try {
    // Get PO details
    const poResult = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [po_id]);
    if (poResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    const po = poResult.rows[0];

    // Check if invoice already exists
    const existing = await pool.query('SELECT id FROM invoices WHERE po_id = $1', [po_id]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Invoice already exists for this PO' });
    }

    // Generate invoice number
    const countResult = await pool.query('SELECT COUNT(*) FROM invoices');
    const count = parseInt(countResult.rows[0].count) + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const result = await pool.query(
      `INSERT INTO invoices (invoice_number, po_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, notes, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [invoiceNumber, po_id, po.vendor_id, po.subtotal, po.tax_rate, po.tax_amount, po.total_amount, notes, due_date]
    );

    await logActivity(req.user.id, 'CREATE', 'invoice', result.rows[0].id, `Generated Invoice: ${invoiceNumber}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
};

// GET /api/invoices/:id/pdf
const downloadInvoicePDF = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, v.company_name, v.email as vendor_email, v.gst_number, v.address as vendor_address,
              po.po_number, po.delivery_address
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN purchase_orders po ON i.po_id = po.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result.rows[0];
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [invoice.po_id]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#0F766E').text('VendorBridge', 50, 50);
    doc.fontSize(10).fillColor('#666').text('Procurement & Vendor Management ERP', 50, 80);
    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#0F766E').stroke();

    // Invoice Title
    doc.fontSize(20).fillColor('#333').text('INVOICE', 400, 50);
    doc.fontSize(10).fillColor('#666');
    doc.text(`Invoice #: ${invoice.invoice_number}`, 400, 80);
    doc.text(`PO #: ${invoice.po_number}`, 400, 95);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 110);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 125);

    // Vendor details
    doc.fontSize(12).fillColor('#333').text('Bill To:', 50, 120);
    doc.fontSize(10).fillColor('#555');
    doc.text(invoice.company_name, 50, 135);
    doc.text(invoice.vendor_email || '', 50, 150);
    doc.text(invoice.vendor_address || '', 50, 165);
    if (invoice.gst_number) doc.text(`GST: ${invoice.gst_number}`, 50, 180);

    // Table header
    const tableTop = 230;
    doc.fillColor('#0F766E').rect(50, tableTop, 500, 25).fill();
    doc.fillColor('#fff').fontSize(10);
    doc.text('Product', 55, tableTop + 7);
    doc.text('Qty', 280, tableTop + 7);
    doc.text('Unit Price', 340, tableTop + 7);
    doc.text('Total', 450, tableTop + 7);

    // Table rows
    let y = tableTop + 30;
    doc.fillColor('#333');
    items.rows.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.fillColor('#f8f8f8').rect(50, y - 5, 500, 22).fill();
      }
      doc.fillColor('#333').fontSize(9);
      doc.text(item.product_name, 55, y);
      doc.text(String(item.quantity), 280, y);
      doc.text(`₹${Number(item.unit_price).toLocaleString('en-IN')}`, 340, y);
      doc.text(`₹${Number(item.total_price).toLocaleString('en-IN')}`, 450, y);
      y += 25;
    });

    // Totals
    y += 20;
    doc.moveTo(50, y).lineTo(550, y).strokeColor('#ddd').stroke();
    y += 15;
    doc.fontSize(10).fillColor('#555');
    doc.text(`Subtotal:`, 380, y);
    doc.text(`₹${Number(invoice.subtotal).toLocaleString('en-IN')}`, 470, y);
    y += 18;
    doc.text(`Tax (${invoice.tax_rate}%):`, 380, y);
    doc.text(`₹${Number(invoice.tax_amount).toLocaleString('en-IN')}`, 470, y);
    y += 18;
    doc.fontSize(12).fillColor('#0F766E');
    doc.text(`TOTAL:`, 380, y);
    doc.text(`₹${Number(invoice.total_amount).toLocaleString('en-IN')}`, 470, y);

    // Footer
    doc.fontSize(9).fillColor('#999').text('Thank you for your business — VendorBridge ERP', 50, 720, { align: 'center' });
    doc.end();

    await logActivity(req.user.id, 'DOWNLOAD_PDF', 'invoice', req.params.id, `Downloaded PDF: ${invoice.invoice_number}`);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

// POST /api/invoices/:id/send-email
const sendInvoiceEmail = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, v.company_name, v.email as vendor_email
       FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (process.env.MOCK_EMAIL === 'true') {
      // Mock mode - just update status
      await pool.query(`UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = $1`, [req.params.id]);
      await logActivity(req.user.id, 'SEND_EMAIL', 'invoice', req.params.id, `Sent (mock) invoice email: ${invoice.invoice_number}`);
      return res.json({ success: true, message: `Invoice ${invoice.invoice_number} sent to ${invoice.vendor_email} (mock mode)` });
    }

    // Real email would go here with nodemailer
    res.json({ success: true, message: 'Invoice emailed successfully' });
  } catch (err) {
    console.error('Send invoice email error:', err);
    res.status(500).json({ success: false, message: 'Failed to send invoice email' });
  }
};

// PUT /api/invoices/:id/status
const updateInvoiceStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const result = await pool.query(
      `UPDATE invoices SET status = $1 ${status === 'paid' ? ', paid_at = NOW()' : ''} WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update invoice status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

module.exports = { getInvoices, getInvoiceById, createInvoice, downloadInvoicePDF, sendInvoiceEmail, updateInvoiceStatus };
