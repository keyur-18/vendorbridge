import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { approvalsAPI } from '../api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { LoadingSpinner, EmptyState, formatDate, formatCurrency } from '../components/ui';
import { CheckSquare, Check, X, Clock, AlertTriangle, FileText, Building2 } from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await approvalsAPI.getAll(filter ? { status: filter } : {});
      setApprovals(res.data.data);
    } catch (err) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (status) => {
    setSubmitting(true);
    try {
      await approvalsAPI.act(actionModal.id, { status, remarks });
      toast.success(`Approval ${status} successfully!`);
      setActionModal(null);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status} approval`);
    } finally {
      setSubmitting(false);
    }
  };

  const statuses = [
    { value: '', label: 'All', count: approvals.length },
    { value: 'pending', label: 'Pending', count: approvals.filter(a => a.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: approvals.filter(a => a.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: approvals.filter(a => a.status === 'rejected').length },
  ];

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Workflow</h1>
          <p className="page-subtitle">
            {pendingCount > 0 && <span style={{ color: 'var(--color-warning)' }}>⚠ {pendingCount} pending · </span>}
            {approvals.length} total approval requests
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {statuses.map(({ value, label, count }) => (
          <button key={value} onClick={() => setFilter(value)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            color: filter === value ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
            borderBottom: filter === value ? '2px solid var(--color-primary-light)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6
          }}>
            {label}
            <span style={{
              padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: filter === value ? 'rgba(20,184,166,0.15)' : 'var(--color-surface-2)',
              color: filter === value ? 'var(--color-primary-light)' : 'var(--color-text-muted)'
            }}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner fullPage /> : approvals.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No approvals found" description="Approval requests will appear here" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {approvals.map(approval => (
            <div key={approval.id} className="card" style={{
              borderLeft: `4px solid ${approval.status === 'pending' ? 'var(--color-warning)' : approval.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)'}`,
              padding: '18px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{approval.rfq_number}</span>
                    <Badge status={approval.status} />
                    {approval.status === 'pending' && (
                      <span style={{ fontSize: 11, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={11} />Awaiting action
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px', lineHeight: 1.3 }}>{approval.rfq_title}</h3>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={11} />{approval.vendor_name}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>
                      {formatCurrency(approval.total_amount)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{approval.delivery_days} days delivery
                    </span>
                    <span>Requested by {approval.requested_by_name}</span>
                  </div>
                  {approval.remarks && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontStyle: 'italic', marginTop: 8 }}>
                      "{approval.remarks}"
                    </div>
                  )}
                  {approval.acted_at && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)} by {approval.approver_name || 'system'} on {formatDate(approval.acted_at)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {approval.status === 'pending' && (
                    <>
                      <button onClick={() => setActionModal({ ...approval, action: 'approve' })} className="btn-success" style={{ padding: '7px 14px', fontSize: 12 }}>
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => setActionModal({ ...approval, action: 'reject' })} className="btn-danger" style={{ padding: '7px 14px', fontSize: 12 }}>
                        <X size={13} /> Reject
                      </button>
                    </>
                  )}
                  <Link to={`/rfqs/${approval.rfq_id}`} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12, textDecoration: 'none' }}>
                    <FileText size={13} /> View RFQ
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      <Modal isOpen={!!actionModal} onClose={() => { setActionModal(null); setRemarks(''); }} title={actionModal?.action === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}>
        {actionModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{actionModal.rfq_title}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Vendor: {actionModal.vendor_name} · {formatCurrency(actionModal.total_amount)}
              </div>
            </div>
            <div>
              <label className="label">Remarks {actionModal.action === 'reject' ? '(required)' : '(optional)'}</label>
              <textarea className="input-field" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder={actionModal.action === 'approve' ? 'Approval notes (optional)...' : 'Reason for rejection...'} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setActionModal(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => handleAction(actionModal.action === 'approve' ? 'approved' : 'rejected')}
                className={actionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}
                disabled={submitting || (actionModal.action === 'reject' && !remarks.trim())}
              >
                {submitting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (
                  actionModal.action === 'approve' ? <><Check size={14} />Confirm Approval</> : <><X size={14} />Confirm Rejection</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
