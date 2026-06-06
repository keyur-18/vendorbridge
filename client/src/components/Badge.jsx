// Status badge with color mapping
const statusConfig = {
  // RFQ statuses
  draft: { label: 'Draft', cls: 'badge-muted' },
  open: { label: 'Open', cls: 'badge-teal' },
  closed: { label: 'Closed', cls: 'badge-warning' },
  awarded: { label: 'Awarded', cls: 'badge-success' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  // Quotation statuses
  submitted: { label: 'Submitted', cls: 'badge-info' },
  revised: { label: 'Revised', cls: 'badge-warning' },
  accepted: { label: 'Accepted', cls: 'badge-success' },
  rejected: { label: 'Rejected', cls: 'badge-danger' },
  // Approval statuses
  pending: { label: 'Pending', cls: 'badge-warning' },
  approved: { label: 'Approved', cls: 'badge-success' },
  // PO statuses
  issued: { label: 'Issued', cls: 'badge-teal' },
  completed: { label: 'Completed', cls: 'badge-success' },
  // Invoice statuses
  sent: { label: 'Sent', cls: 'badge-info' },
  paid: { label: 'Paid', cls: 'badge-success' },
  // Vendor statuses
  active: { label: 'Active', cls: 'badge-success' },
  inactive: { label: 'Inactive', cls: 'badge-muted' },
  // Invitation statuses
  invited: { label: 'Invited', cls: 'badge-info' },
  viewed: { label: 'Viewed', cls: 'badge-warning' },
  quoted: { label: 'Quoted', cls: 'badge-teal' },
  declined: { label: 'Declined', cls: 'badge-danger' },
};

export default function Badge({ status, customLabel }) {
  const config = statusConfig[status] || { label: status, cls: 'badge-muted' };
  return (
    <span className={`badge ${config.cls}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {customLabel || config.label}
    </span>
  );
}
