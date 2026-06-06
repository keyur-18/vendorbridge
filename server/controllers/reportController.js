const pool = require('../db/pool');

// GET /api/reports/dashboard
const getDashboard = async (req, res) => {
  try {
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

module.exports = { getDashboard, getVendorPerformance, getSpendingSummary, getMonthlyTrends };
