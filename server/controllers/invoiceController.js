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

const generatePDFBuffer = (invoice, items) => {
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

      // Invoice Header Metadata (Right)
      doc.fontSize(20).fillColor('#1E293B').font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right', width: 150 });
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(`Invoice #: ${invoice.invoice_number}`, 400, 75, { align: 'right', width: 150 });
      doc.text(`PO #: ${invoice.po_number || '—'}`, 400, 90, { align: 'right', width: 150 });
      doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}`, 400, 105, { align: 'right', width: 150 });
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 120, { align: 'right', width: 150 });

      // Clean horizontal divider line
      doc.moveTo(50, 145).lineTo(550, 145).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Bill To (Left) & Ship To (Right) Grid
      const infoY = 160;
      doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('BILL TO:', 50, infoY);
      doc.fontSize(11).fillColor('#1E293B').font('Helvetica-Bold').text(invoice.company_name, 50, infoY + 15);
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(invoice.vendor_address || '', 50, infoY + 30, { width: 230 });
      doc.text(`Email: ${invoice.vendor_email || ''}`, 50, infoY + 60, { width: 230 });
      if (invoice.gst_number) {
        doc.text(`GSTIN: ${invoice.gst_number}`, 50, infoY + 75, { width: 230 });
      }

      doc.fontSize(9).fillColor('#64748B').font('Helvetica-Bold').text('SHIP TO / DELIVERY:', 300, infoY);
      doc.fontSize(11).fillColor('#1E293B').font('Helvetica-Bold').text('VendorBridge Corp', 300, infoY + 15);
      doc.fontSize(9).fillColor('#475569').font('Helvetica');
      doc.text(invoice.delivery_address || 'Company Headquarters Address', 300, infoY + 30, { width: 250 });

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
      items.rows.forEach((item, i) => {
        // Alternate row background coloring
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
      doc.fontSize(9).fillColor('#1E293B').font('Helvetica-Bold').text(`INR ${Number(invoice.subtotal).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });
      
      y += 18;
      doc.fontSize(9).fillColor('#64748B').font('Helvetica').text(`Tax (${invoice.tax_rate}%):`, 340, y, { width: 100, align: 'right' });
      doc.fontSize(9).fillColor('#1E293B').font('Helvetica-Bold').text(`INR ${Number(invoice.tax_amount).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });
      
      y += 18;
      doc.moveTo(340, y).lineTo(550, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
      y += 8;

      doc.fontSize(11).fillColor('#0F766E').font('Helvetica-Bold').text('TOTAL:', 340, y, { width: 100, align: 'right' });
      doc.fontSize(11).fillColor('#0F766E').font('Helvetica-Bold').text(`INR ${Number(invoice.total_amount).toLocaleString('en-IN')}`, 440, y, { width: 100, align: 'right' });

      // Footer
      doc.fontSize(8).fillColor('#94A3B8').font('Helvetica').text('Thank you for your business — VendorBridge ERP', 50, 720, { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// GET /api/invoices
const getInvoices = async (req, res) => {
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
      conditions.push(`i.vendor_id = $${idx}`);
      params.push(vendorId);
      idx++;
    }

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

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this invoice does not belong to you' });
      }
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

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this invoice does not belong to you' });
      }
    }

    const invoice = result.rows[0];
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [invoice.po_id]);

    const pdfBuffer = await generatePDFBuffer(invoice, items);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

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

    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0 || vendorResult.rows[0].id !== result.rows[0].vendor_id) {
        return res.status(403).json({ success: false, message: 'Access denied: this invoice does not belong to you' });
      }
    }

    const invoice = result.rows[0];
    const items = await pool.query('SELECT * FROM po_items WHERE po_id = $1', [invoice.po_id]);

    const pdfBuffer = await generatePDFBuffer(invoice, items);

    await pool.query(`UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = $1`, [req.params.id]);

    const recipientEmails = [invoice.vendor_email, req.user.email].filter(Boolean);

    if (process.env.MOCK_EMAIL !== 'true') {
      await transporter.sendMail({
        from: `"VendorBridge System" <${process.env.SMTP_USER}>`,
        to: recipientEmails.join(', '),
        subject: `[VendorBridge] Purchase Order Invoice: ${invoice.invoice_number}`,
        text: `Dear ${invoice.company_name},

Please find attached the invoice ${invoice.invoice_number} for Purchase Order ${invoice.po_number || '—'}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- PO Number: ${invoice.po_number || '—'}
- Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}
- Total Amount: INR ${Number(invoice.total_amount).toLocaleString('en-IN')}

This invoice was sent to you by ${req.user.name} (${req.user.email}).

Regards,
VendorBridge ERP`,
        attachments: [
          {
            filename: `${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
          }
        ]
      });
    }

    await logActivity(req.user.id, 'SEND_EMAIL', 'invoice', req.params.id, `Sent invoice email to ${recipientEmails.join(', ')}: ${invoice.invoice_number}`);
    res.json({ success: true, message: `Invoice email successfully sent to ${recipientEmails.join(', ')}` });
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
    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) {
        return res.status(403).json({ success: false, message: 'Access denied: this invoice does not belong to you' });
      }
      const vendorId = vendorResult.rows[0].id;
      const invoiceCheck = await pool.query('SELECT vendor_id FROM invoices WHERE id = $1', [req.params.id]);
      if (invoiceCheck.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      if (invoiceCheck.rows[0].vendor_id !== vendorId) {
        return res.status(403).json({ success: false, message: 'Access denied: this invoice does not belong to you' });
      }
    }

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
