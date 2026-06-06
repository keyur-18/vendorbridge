import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import { authUserAtom } from '../atoms';
import { rfqsAPI, approvalsAPI, authAPI } from '../api';
import { quotationSchema } from '../schemas';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { LoadingSpinner, formatDate, formatCurrency } from '../components/ui';
import { ArrowLeft, Package, Calendar, Users, FileText, Send, Plus, Star, CheckCircle, AlertCircle, Clock } from 'lucide-react';

function QuotationSubmitForm({ rfqItems, onSubmit, loading }) {
  const [form, setForm] = useState({
    delivery_days: 14,
    validity_days: 30,
    notes: '',
    items: rfqItems.map(item => ({ rfq_item_id: item.id, product_name: item.product_name, quantity: item.quantity, unit: item.unit || 'units', unit_price: '' }))
  });

  const handleItemChange = (i, field, val) => {
    setForm(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });
  };

  const total = form.items.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.unit_price) || 0)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      delivery_days: parseInt(form.delivery_days),
      validity_days: parseInt(form.validity_days),
      items: form.items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) || 0 }))
    };

    const result = quotationSchema.safeParse(payload);
    if (!result.success) {
      const firstErr = result.error.errors[0];
      return toast.error(firstErr.message);
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="form-grid-2">
        <div>
          <label className="label">Delivery Days *</label>
          <input type="number" className="input-field" min="1" value={form.delivery_days}
            onChange={e => setForm(p => ({ ...p, delivery_days: e.target.value }))} />
        </div>
        <div>
          <label className="label">Validity Days</label>
          <input type="number" className="input-field" min="1" value={form.validity_days}
            onChange={e => setForm(p => ({ ...p, validity_days: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="label">Pricing Details</label>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>Product</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', width: 80 }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', width: 60 }}>Unit</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', width: 130 }}>Unit Price (₹)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', width: 120 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(226,232,240,0.8)', fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid rgba(226,232,240,0.8)', color: 'var(--color-text-muted)' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid rgba(226,232,240,0.8)', color: 'var(--color-text-muted)', fontSize: 11 }}>{item.unit}</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                    <input type="number" className="input-field" min="0.01" step="0.01" placeholder="0.00"
                      value={item.unit_price} onChange={e => handleItemChange(i, 'unit_price', e.target.value)}
                      style={{ textAlign: 'right', padding: '6px 10px', fontSize: 13 }} />
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid rgba(226,232,240,0.8)', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                    {formatCurrency(item.quantity * (parseFloat(item.unit_price) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Total Quote Value:</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--color-primary-light)' }}>{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <label className="label">Notes / Terms</label>
        <textarea className="input-field" rows={3} placeholder="Warranty terms, payment conditions, special offers..." value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Send size={14} /> Submit Quotation</>}
        </button>
      </div>
    </form>
  );
}

export default function RFQDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useRecoilValue(authUserAtom);
  const [rfq, setRfq] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [selectedApprover, setSelectedApprover] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rfqRes, quotesRes] = await Promise.all([
        rfqsAPI.getById(id),
        rfqsAPI.getQuotations(id),
      ]);
      setRfq(rfqRes.data.data);
      setQuotations(quotesRes.data.data);
    } catch (err) {
      toast.error('Failed to load RFQ');
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (showApprovalModal) {
      authAPI.getManagers().then(res => setApprovers(res.data.data)).catch(() => {});
    }
  }, [showApprovalModal]);

  const handleSubmitQuote = async (data) => {
    setSubmitting(true);
    try {
      await rfqsAPI.submitQuotation(id, data);
      toast.success('Quotation submitted successfully!');
      setShowQuoteModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!selectedQuote || !selectedApprover) return toast.error('Select a quotation and approver');
    setSubmitting(true);
    try {
      await approvalsAPI.create({ rfq_id: id, quotation_id: selectedQuote, approver_id: selectedApprover });
      toast.success('Approval requested!');
      setShowApprovalModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;
  if (!rfq) return null;

  const lowestPrice = quotations.length > 0 ? Math.min(...quotations.map(q => parseFloat(q.total_amount))) : null;
  const canSubmitQuote = user?.role === 'vendor' && rfq.status === 'open';
  const canRequestApproval = ['admin', 'procurement_officer'].includes(user?.role) && quotations.length > 0 && rfq.status === 'open';

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <button onClick={() => navigate('/rfqs')} className="btn-secondary" style={{ padding: '8px 10px', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{rfq.rfq_number}</span>
            <Badge status={rfq.status} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.3 }}>{rfq.title}</h1>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            {user?.role !== 'vendor' && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{rfq.vendors?.length || 0} invited vendors</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} />{quotations.length} quotations</span>
            {rfq.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />Deadline: {formatDate(rfq.deadline)}</span>}
            <span>By {rfq.created_by_name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canSubmitQuote && (
            <button className="btn-primary" onClick={() => setShowQuoteModal(true)}>
              <Send size={14} /> Submit Quote
            </button>
          )}
          {canRequestApproval && (
            <button className="btn-success" onClick={() => setShowApprovalModal(true)}>
              <CheckCircle size={14} /> Request Approval
            </button>
          )}
          {['admin', 'procurement_officer'].includes(user?.role) && rfq.status !== 'draft' && (
            <Link to={`/rfqs/${id}/compare`} className="btn-secondary" style={{ textDecoration: 'none' }}>
              Compare Quotes
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Description */}
          {rfq.description && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Description</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6 }}>{rfq.description}</div>
            </div>
          )}

          {/* Items */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={16} color="var(--color-primary-light)" />
              <span style={{ fontWeight: 700 }}>Required Items ({rfq.items?.length || 0})</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Product / Service</th><th>Quantity</th><th>Unit</th><th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.items?.map((item, i) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td><span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-surface-2)', borderRadius: 4 }}>{item.unit || 'units'}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.specifications || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quotations */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="var(--color-primary-light)" />
              <span style={{ fontWeight: 700 }}>Quotations Received ({quotations.length})</span>
            </div>
            {quotations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>No quotations received yet</div>
            ) : (
              <div>
                {quotations.map(q => (
                  <div key={q.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-primary-light)', fontSize: 13 }}>
                          {q.company_name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{q.company_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={10} />{q.delivery_days} days delivery
                            <Star size={10} color="#F59E0B" fill="#F59E0B" />{parseFloat(q.rating || 0).toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: (user?.role !== 'vendor' && parseFloat(q.total_amount) === lowestPrice) ? 'var(--color-success)' : 'var(--color-primary-light)' }}>
                          {formatCurrency(q.total_amount)}
                          {user?.role !== 'vendor' && parseFloat(q.total_amount) === lowestPrice && <span style={{ fontSize: 10, marginLeft: 6, padding: '2px 6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, color: 'var(--color-success)' }}>Lowest</span>}
                        </div>
                        <Badge status={q.status} />
                      </div>
                    </div>
                    {q.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{q.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Invited Vendors) */}
        {user?.role !== 'vendor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color="var(--color-primary-light)" />Invited Vendors
              </div>
              <div>
                {rfq.vendors?.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No vendors invited</div>
                ) : rfq.vendors?.map(v => (
                  <div key={v.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(226,232,240,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{v.company_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{v.email}</div>
                    </div>
                    <Badge status={v.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Quote Modal */}
      <Modal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} title="Submit Quotation" size="lg">
        <QuotationSubmitForm rfqItems={rfq.items || []} onSubmit={handleSubmitQuote} loading={submitting} />
      </Modal>

      {/* Request Approval Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title="Request Approval" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Select Quotation *</label>
            <select className="input-field" value={selectedQuote} onChange={e => setSelectedQuote(e.target.value)}>
              <option value="">Choose a quotation...</option>
              {quotations.filter(q => ['submitted', 'revised'].includes(q.status)).map(q => (
                <option key={q.id} value={q.id}>{q.company_name} — {formatCurrency(q.total_amount)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Select Approver (Manager) *</label>
            <select className="input-field" value={selectedApprover} onChange={e => setSelectedApprover(e.target.value)}>
              <option value="">Select a manager...</option>
              {approvers.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowApprovalModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleRequestApproval} className="btn-primary" disabled={submitting || !selectedQuote || !selectedApprover}>
              {submitting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><CheckCircle size={14} />Request Approval</>}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
