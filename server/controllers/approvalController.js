const pool = require('../db/pool');
const { logActivity, createNotification } = require('../middleware/logger');

// GET /api/approvals
const getApprovals = async (req, res) => {
  try {
    const { status } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.user.role === 'manager') {
      conditions.push(`a.approver_id = $${idx}`);
      params.push(req.user.id);
      idx++;
    }
    if (status) {
      conditions.push(`a.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.*, 
              r.rfq_number, r.title as rfq_title,
              q.total_amount, q.delivery_days,
              v.company_name as vendor_name,
              u1.name as requested_by_name,
              u2.name as approver_name
       FROM approvals a
       LEFT JOIN rfqs r ON a.rfq_id = r.id
       LEFT JOIN quotations q ON a.quotation_id = q.id
       LEFT JOIN vendors v ON q.vendor_id = v.id
       LEFT JOIN users u1 ON a.requested_by = u1.id
       LEFT JOIN users u2 ON a.approver_id = u2.id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get approvals error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch approvals' });
  }
};

// POST /api/approvals
const createApproval = async (req, res) => {
  const { rfq_id, quotation_id, approver_id } = req.body;
  
  if (!quotation_id) {
    return res.status(400).json({ success: false, message: 'quotation_id is required' });
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM approvals WHERE quotation_id = $1 AND status = 'pending'`,
      [quotation_id]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'An approval request already exists for this quotation' });
    }

    const result = await pool.query(
      `INSERT INTO approvals (rfq_id, quotation_id, requested_by, approver_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [rfq_id, quotation_id, req.user.id, approver_id]
    );

    if (approver_id) {
      await createNotification(
        approver_id,
        'New Approval Request',
        'A procurement approval request requires your action',
        'approval', 'approval', result.rows[0].id
      );
    }

    await logActivity(req.user.id, 'REQUEST_APPROVAL', 'approval', result.rows[0].id, `Requested approval for quotation ${quotation_id}`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create approval error:', err);
    res.status(500).json({ success: false, message: 'Failed to create approval request' });
  }
};

// PUT /api/approvals/:id
const actOnApproval = async (req, res) => {
  const { status, remarks } = req.body;
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be "approved" or "rejected"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE approvals SET status = $1, remarks = $2, acted_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, remarks, req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }

    const approval = result.rows[0];

    if (status === 'approved') {
      await client.query(
        `UPDATE quotations SET status = 'accepted' WHERE id = $1`,
        [approval.quotation_id]
      );
      if (approval.rfq_id) {
        await client.query(`UPDATE rfqs SET status = 'awarded' WHERE id = $1`, [approval.rfq_id]);
      }
    } else {
      await client.query(
        `UPDATE quotations SET status = 'rejected' WHERE id = $1`,
        [approval.quotation_id]
      );
    }

    if (approval.requested_by) {
      await createNotification(
        approval.requested_by,
        `Approval ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your procurement approval request has been ${status}${remarks ? ': ' + remarks : ''}`,
        status === 'approved' ? 'success' : 'error',
        'approval', approval.id
      );
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, status.toUpperCase(), 'approval', req.params.id, `${status} approval for quotation ${approval.quotation_id}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Act on approval error:', err);
    res.status(500).json({ success: false, message: 'Failed to process approval' });
  } finally {
    client.release();
  }
};

// GET /api/approvals/:id
const getApprovalById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              r.rfq_number, r.title as rfq_title,
              q.total_amount, q.delivery_days, q.notes as quotation_notes,
              v.company_name as vendor_name, v.email as vendor_email,
              u1.name as requested_by_name,
              u2.name as approver_name
       FROM approvals a
       LEFT JOIN rfqs r ON a.rfq_id = r.id
       LEFT JOIN quotations q ON a.quotation_id = q.id
       LEFT JOIN vendors v ON q.vendor_id = v.id
       LEFT JOIN users u1 ON a.requested_by = u1.id
       LEFT JOIN users u2 ON a.approver_id = u2.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Approval not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get approval error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch approval' });
  }
};

module.exports = { getApprovals, createApproval, actOnApproval, getApprovalById };
