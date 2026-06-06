const pool = require('../db/pool');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../middleware/logger');

// GET /api/reports/dashboard
const getDashboard = async (req, res) => {
  try {
    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) {
        return res.json({
          success: true,
          data: {
            stats: { pendingApprovals: 0, activeRFQs: 0, totalVendors: 0, totalPOs: 0, totalInvoices: 0, totalSpend: 0 },
            recentPOs: [], recentInvoices: [], rfqStats: []
          }
        });
      }
      const vendorId = vendorResult.rows[0].id;

      const [activeRFQs, totalPOs, totalInvoices, recentPOs, recentInvoices, rfqStats, totalSpend] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM rfqs r WHERE r.status IN ('open') AND EXISTS (SELECT 1 FROM rfq_vendors rv WHERE rv.rfq_id = r.id AND rv.vendor_id = $1)`, [vendorId]),
        pool.query(`SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = $1`, [vendorId]),
        pool.query(`SELECT COUNT(*) FROM invoices WHERE vendor_id = $1`, [vendorId]),
        pool.query(`SELECT po.*, v.company_name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE po.vendor_id = $1 ORDER BY po.created_at DESC LIMIT 5`, [vendorId]),
        pool.query(`SELECT i.*, v.company_name as vendor_name FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id WHERE i.vendor_id = $1 ORDER BY i.created_at DESC LIMIT 5`, [vendorId]),
        pool.query(`SELECT r.status, COUNT(*) FROM rfqs r WHERE EXISTS (SELECT 1 FROM rfq_vendors rv WHERE rv.rfq_id = r.id AND rv.vendor_id = $1) GROUP BY r.status`, [vendorId]),
        pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE vendor_id = $1 AND status != 'cancelled'`, [vendorId]),
      ]);

      return res.json({
        success: true,
        data: {
          stats: {
            pendingApprovals: 0,
            activeRFQs: parseInt(activeRFQs.rows[0].count),
            totalVendors: 1,
            totalPOs: parseInt(totalPOs.rows[0].count),
            totalInvoices: parseInt(totalInvoices.rows[0].count),
            totalSpend: parseFloat(totalSpend.rows[0].total),
          },
          recentPOs: recentPOs.rows,
          recentInvoices: recentInvoices.rows,
          rfqStats: rfqStats.rows,
        }
      });
    }

    const [pendingApprovals, activeRFQs, totalVendors, totalPOs, totalInvoices, recentPOs, recentInvoices, rfqStats] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM approvals WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM rfqs WHERE status IN ('open', 'draft')`),
      pool.query(`SELECT COUNT(*) FROM vendors WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*) FROM purchase_orders`),
      pool.query(`SELECT COUNT(*) FROM invoices`),
      pool.query(`SELECT po.*, v.company_name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id ORDER BY po.created_at DESC LIMIT 5`),
      pool.query(`SELECT i.*, v.company_name as vendor_name FROM invoices i LEFT JOIN vendors v ON i.vendor_id = v.id ORDER BY i.created_at DESC LIMIT 5`),
      pool.query(`SELECT status, COUNT(*) FROM rfqs GROUP BY status`),
    ]);

    const totalSpend = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status != 'cancelled'`);

    res.json({
      success: true,
      data: {
        stats: {
          pendingApprovals: parseInt(pendingApprovals.rows[0].count),
          activeRFQs: parseInt(activeRFQs.rows[0].count),
          totalVendors: parseInt(totalVendors.rows[0].count),
          totalPOs: parseInt(totalPOs.rows[0].count),
          totalInvoices: parseInt(totalInvoices.rows[0].count),
          totalSpend: parseFloat(totalSpend.rows[0].total),
        },
        recentPOs: recentPOs.rows,
        recentInvoices: recentInvoices.rows,
        rfqStats: rfqStats.rows,
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

// GET /api/reports/vendor-performance
const getVendorPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.company_name, v.category, v.rating,
        COUNT(DISTINCT q.id) as total_quotations,
        COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) as won_bids,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(po.total_amount), 0) as total_spend
      FROM vendors v
      LEFT JOIN quotations q ON q.vendor_id = v.id
      LEFT JOIN purchase_orders po ON po.vendor_id = v.id
      GROUP BY v.id, v.company_name, v.category, v.rating
      ORDER BY total_spend DESC
      LIMIT 20
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Vendor performance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor performance' });
  }
};

// GET /api/reports/spending
const getSpendingSummary = async (req, res) => {
  try {
    const [categorySpend, monthlySpend, statusBreakdown] = await Promise.all([
      pool.query(`
        SELECT v.category, COALESCE(SUM(po.total_amount), 0) as total
        FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id
        WHERE po.status != 'cancelled'
        GROUP BY v.category ORDER BY total DESC
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', po.created_at) as month,
               COALESCE(SUM(po.total_amount), 0) as total,
               COUNT(*) as count
        FROM purchase_orders po
        WHERE po.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      pool.query(`SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM purchase_orders GROUP BY status`),
    ]);

    res.json({
      success: true,
      data: {
        byCategory: categorySpend.rows,
        monthly: monthlySpend.rows,
        byStatus: statusBreakdown.rows,
      }
    });
  } catch (err) {
    console.error('Spending summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch spending summary' });
  }
};

// GET /api/reports/monthly-trends
const getMonthlyTrends = async (req, res) => {
  try {
    if (req.user.role === 'vendor') {
      const vendorResult = await pool.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rowCount === 0) {
        return res.json({
          success: true,
          data: { rfqs: [], purchaseOrders: [], invoices: [] }
        });
      }
      const vendorId = vendorResult.rows[0].id;

      const [rfqTrends, poTrends, invoiceTrends] = await Promise.all([
        pool.query(`
          SELECT DATE_TRUNC('month', r.created_at) as month, COUNT(*) as count
          FROM rfqs r WHERE r.created_at >= NOW() - INTERVAL '12 months'
          AND EXISTS (SELECT 1 FROM rfq_vendors rv WHERE rv.rfq_id = r.id AND rv.vendor_id = $1)
          GROUP BY month ORDER BY month
        `, [vendorId]),
        pool.query(`
          SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
          FROM purchase_orders WHERE created_at >= NOW() - INTERVAL '12 months'
          AND vendor_id = $1
          GROUP BY month ORDER BY month
        `, [vendorId]),
        pool.query(`
          SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
          FROM invoices WHERE created_at >= NOW() - INTERVAL '12 months'
          AND vendor_id = $1
          GROUP BY month ORDER BY month
        `, [vendorId]),
      ]);

      return res.json({
        success: true,
        data: {
          rfqs: rfqTrends.rows,
          purchaseOrders: poTrends.rows,
          invoices: invoiceTrends.rows,
        }
      });
    }

    const [rfqTrends, poTrends, invoiceTrends] = await Promise.all([
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
        FROM rfqs WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
        FROM purchase_orders WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
      pool.query(`
        SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
        FROM invoices WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
    ]);

    res.json({
      success: true,
      data: {
        rfqs: rfqTrends.rows,
        purchaseOrders: poTrends.rows,
        invoices: invoiceTrends.rows,
      }
    });
  } catch (err) {
    console.error('Monthly trends error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly trends' });
  }
};

// GET /api/reports/export-pdf
const exportPDFReport = async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied: only admins and managers can export reports' });
  }

  try {
    const [pendingApprovals, activeRFQs, totalVendors, totalPOs, totalInvoices, totalSpendResult, vendorPerfResult, categorySpend] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM approvals WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM rfqs WHERE status IN ('open', 'draft')`),
      pool.query(`SELECT COUNT(*) FROM vendors WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*) FROM purchase_orders`),
      pool.query(`SELECT COUNT(*) FROM invoices`),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status != 'cancelled'`),
      pool.query(`
        SELECT v.id, v.company_name, v.category, v.rating,
          COUNT(DISTINCT q.id) as total_quotations,
          COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) as won_bids,
          COUNT(DISTINCT po.id) as total_pos,
          COALESCE(SUM(po.total_amount), 0) as total_spend
        FROM vendors v
        LEFT JOIN quotations q ON q.vendor_id = v.id
        LEFT JOIN purchase_orders po ON po.vendor_id = v.id
        GROUP BY v.id, v.company_name, v.category, v.rating
        ORDER BY total_spend DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT v.category, COALESCE(SUM(po.total_amount), 0) as total
        FROM purchase_orders po JOIN vendors v ON po.vendor_id = v.id
        WHERE po.status != 'cancelled'
        GROUP BY v.category ORDER BY total DESC
      `),
    ]);

    const totalSpendVal = parseFloat(totalSpendResult.rows[0].total);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Procurement_Report_${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#4F46E5').text('VendorBridge', 50, 50);
    doc.fontSize(10).fillColor('#64748B').text('Procurement & Vendor Management ERP', 50, 80);
    doc.lineWidth(1.5).moveTo(50, 95).lineTo(550, 95).strokeColor('#4F46E5').stroke();

    // Title
    doc.fontSize(18).fillColor('#0F172A').text('EXECUTIVE PROCUREMENT & ANALYTICS REPORT', 50, 115, { align: 'center' });
    doc.fontSize(9).fillColor('#64748B').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, 135, { align: 'center' });

    // Stats Section
    doc.fontSize(13).fillColor('#4F46E5').text('1. Key Performance Metrics', 50, 160);
    doc.lineWidth(1).moveTo(50, 178).lineTo(550, 178).strokeColor('#E2E8F0').stroke();

    const stats = [
      { label: 'Active RFQs', val: activeRFQs.rows[0].count },
      { label: 'Registered active vendors', val: totalVendors.rows[0].count },
      { label: 'Total Purchase Orders', val: totalPOs.rows[0].count },
      { label: 'Total Invoices issued', val: totalInvoices.rows[0].count },
      { label: 'Total Invoice Spend', val: `INR ${Number(totalSpendVal).toLocaleString('en-IN')}` },
    ];

    let y = 195;
    stats.forEach(stat => {
      doc.fontSize(10).fillColor('#334155').text(stat.label, 60, y);
      doc.fontSize(10).fillColor('#0F172A').font('Helvetica-Bold').text(String(stat.val), 350, y, { align: 'right', width: 190 });
      doc.font('Helvetica');
      doc.moveTo(60, y + 15).lineTo(540, y + 15).strokeColor('#F1F5F9').stroke();
      y += 22;
    });

    // Spending by Category Section
    y += 15;
    doc.fontSize(13).fillColor('#4F46E5').text('2. Spending by Vendor Category', 50, y);
    doc.lineWidth(1).moveTo(50, y + 18).lineTo(550, y + 18).strokeColor('#E2E8F0').stroke();
    y += 28;

    // Table Header
    doc.fillColor('#F8FAFC').rect(50, y, 500, 20).fill();
    doc.fontSize(9).fillColor('#4F46E5').font('Helvetica-Bold');
    doc.text('Category', 60, y + 5);
    doc.text('Total Spend (INR)', 300, y + 5);
    doc.text('Percentage', 460, y + 5);
    doc.font('Helvetica').fillColor('#334155');
    y += 23;

    categorySpend.rows.forEach((cat, idx) => {
      const catTotal = parseFloat(cat.total || 0);
      const pct = totalSpendVal > 0 ? (catTotal / totalSpendVal) * 100 : 0;
      
      if (idx % 2 === 0) {
        doc.fillColor('#F8FAFC').rect(50, y - 3, 500, 16).fill();
      }
      doc.fontSize(9).fillColor('#334155');
      doc.text(cat.category || 'Other', 60, y);
      doc.text(`INR ${Number(catTotal).toLocaleString('en-IN')}`, 300, y);
      doc.text(`${pct.toFixed(1)}%`, 460, y);
      y += 18;
    });

    // Page 2: Vendor Performance Rankings
    doc.addPage();
    doc.fontSize(24).fillColor('#4F46E5').text('VendorBridge', 50, 50);
    doc.fontSize(10).fillColor('#64748B').text('Procurement & Vendor Management ERP', 50, 80);
    doc.lineWidth(1.5).moveTo(50, 95).lineTo(550, 95).strokeColor('#4F46E5').stroke();

    doc.fontSize(13).fillColor('#4F46E5').text('3. Vendor Performance Rankings (Top 10)', 50, 115);
    doc.lineWidth(1).moveTo(50, 133).lineTo(550, 133).strokeColor('#E2E8F0').stroke();
    
    y = 150;
    // Table Header
    doc.fillColor('#F8FAFC').rect(50, y, 500, 20).fill();
    doc.fontSize(9).fillColor('#4F46E5').font('Helvetica-Bold');
    doc.text('Rank', 55, y + 5);
    doc.text('Company Name', 90, y + 5);
    doc.text('Rating', 250, y + 5);
    doc.text('Won / Total Bids', 310, y + 5);
    doc.text('POs', 420, y + 5);
    doc.text('Spend (INR)', 470, y + 5);
    doc.font('Helvetica').fillColor('#334155');
    y += 23;

    vendorPerfResult.rows.forEach((v, idx) => {
      if (idx % 2 === 0) {
        doc.fillColor('#F8FAFC').rect(50, y - 3, 500, 16).fill();
      }
      doc.fontSize(9).fillColor('#334155');
      doc.text(String(idx + 1), 55, y);
      doc.text(v.company_name || '—', 90, y, { width: 155, height: 14, ellipsis: true });
      doc.text(`${parseFloat(v.rating || 0).toFixed(1)} / 5.0`, 250, y);
      doc.text(`${v.won_bids} / ${v.total_quotations}`, 310, y);
      doc.text(String(v.total_pos), 420, y);
      doc.text(`INR ${Number(v.total_spend).toLocaleString('en-IN')}`, 470, y);
      y += 18;
    });

    // Footer note
    doc.fontSize(8).fillColor('#94A3B8').text('Confidential — For Internal Use Only', 50, 720, { align: 'center' });
    doc.end();

    await logActivity(req.user.id, 'DOWNLOAD_PDF', 'report', null, 'Downloaded Procurement & Analytics Report PDF');
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

module.exports = { getDashboard, getVendorPerformance, getSpendingSummary, getMonthlyTrends, exportPDFReport };
