import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import { rfqsAPI, vendorsAPI } from '../api';
import { rfqsAtom, rfqFiltersAtom, authUserAtom } from '../atoms';
import { rfqSchema } from '../schemas';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { LoadingSpinner, EmptyState, formatDate } from '../components/ui';
import { Plus, FileText, Calendar, Users, Search, Trash2, Eye } from 'lucide-react';

function RFQForm({ onSubmit, loading }) {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', vendor_ids: [],
    items: [{ product_name: '', quantity: 1, unit: 'units', specifications: '' }]
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    vendorsAPI.getAll({ status: 'active', limit: 100 }).then(res => setVendors(res.data.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleItemChange = (i, field, val) => {
    setForm(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });
    if (errors.items) setErrors(prev => ({ ...prev, items: null }));
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { product_name: '', quantity: 1, unit: 'units', specifications: '' }] }));
  };

  const removeItem = (i) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
  };

  const toggleVendor = (id) => {
    setForm(prev => ({
      ...prev,
      vendor_ids: prev.vendor_ids.includes(id) ? prev.vendor_ids.filter(v => v !== id) : [...prev.vendor_ids, id]
    }));
  };

  const validate = () => {
    const payload = {
      ...form,
      items: form.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) }))
    };
    const result = rfqSchema.safeParse(payload);
    if (!result.success) {
      const errs = {};
      result.error.errors.forEach(e => {
        const key = e.path[0] === 'items' ? 'items' : e.path[0];
        errs[key] = e.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...form,
      items: form.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) }))
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">RFQ Title *</label>
        <input name="title" className="input-field" placeholder="e.g., Office Laptop Procurement Q4 2024" value={form.title} onChange={handleChange} />
        {errors.title && <div className="error-text">{errors.title}</div>}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea name="description" className="input-field" rows={2} placeholder="Describe procurement requirements..." value={form.description} onChange={handleChange} style={{ resize: 'vertical' }} />
      </div>

      <div className="form-grid-2">
        <div>
          <label className="label">Deadline *</label>
          <input name="deadline" type="datetime-local" className="input-field" value={form.deadline} onChange={handleChange} min={new Date().toISOString().slice(0, 16)} />
          {errors.deadline && <div className="error-text">{errors.deadline}</div>}
        </div>
      </div>

      {/* Items */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label className="label" style={{ margin: 0 }}>Product/Service Items *</label>
          <button type="button" onClick={addItem} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
            <Plus size={12} /> Add Item
          </button>
        </div>
        {errors.items && <div className="error-text" style={{ marginBottom: 8 }}>{errors.items}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.items.map((item, i) => (
            <div key={i} style={{ background: 'var(--color-surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 2 }}>
                  <input className="input-field" placeholder="Product/Service name" value={item.product_name}
                    onChange={e => handleItemChange(i, 'product_name', e.target.value)} style={{ padding: '7px 10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input className="input-field" type="number" placeholder="Qty" min="0.01" step="0.01" value={item.quantity}
                    onChange={e => handleItemChange(i, 'quantity', e.target.value)} style={{ padding: '7px 10px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <select className="input-field" value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)} style={{ padding: '7px 10px' }}>
                    <option value="units">Units</option>
                    <option value="kg">KG</option>
                    <option value="liters">Liters</option>
                    <option value="boxes">Boxes</option>
                    <option value="license">License</option>
                    <option value="months">Months</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: 7, cursor: 'pointer', color: 'var(--color-danger)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <input className="input-field" placeholder="Specifications (optional)" value={item.specifications}
                onChange={e => handleItemChange(i, 'specifications', e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Selection */}
      {vendors.length > 0 && (
        <div>
          <label className="label">Invite Vendors ({form.vendor_ids.length} selected)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 160, overflowY: 'auto', padding: 4 }}>
            {vendors.map(v => (
              <label key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                background: form.vendor_ids.includes(v.id) ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-2)',
                border: form.vendor_ids.includes(v.id) ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--color-border)',
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', fontSize: 12
              }}>
                <input type="checkbox" checked={form.vendor_ids.includes(v.id)} onChange={() => toggleVendor(v.id)} style={{ accentColor: 'var(--color-primary-light)' }} />
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{v.company_name}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{v.category}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Create RFQ'}
        </button>
      </div>
    </form>
  );
}

export default function RFQsPage() {
  const [rfqs, setRfqs] = useRecoilState(rfqsAtom);
  const [filters, setFilters] = useRecoilState(rfqFiltersAtom);
  const user = useRecoilValue(authUserAtom);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCreateModal && user?.role !== 'vendor') {
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rfqsAPI.getAll(filters);
      setRfqs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load RFQs');
    } finally {
      setLoading(false);
    }
  }, [filters, setRfqs]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      const res = await rfqsAPI.create(data);
      toast.success('RFQ created successfully!');
      setShowModal(false);
      navigate(`/rfqs/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create RFQ');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = { draft: '#94A3B8', open: '#14B8A6', closed: '#F59E0B', awarded: '#22C55E', cancelled: '#EF4444' };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">RFQ Management</h1>
          <p className="page-subtitle">{total} total requests for quotation</p>
        </div>
        {user?.role !== 'vendor' && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Create RFQ
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-sm" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input className="input-field" placeholder="Search RFQs..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }} />
        </div>
        <select className="input-field" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} style={{ width: 140 }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="awarded">Awarded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* RFQ Cards Grid */}
      {loading ? <LoadingSpinner fullPage /> : rfqs.length === 0 ? (
        <EmptyState icon={FileText} title="No RFQs found" description="Create your first Request for Quotation" action={
          user?.role !== 'vendor' && <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={14} />Create RFQ</button>
        } />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {rfqs.map(rfq => (
            <Link to={`/rfqs/${rfq.id}`} key={rfq.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                cursor: 'pointer', transition: 'all 0.2s',
                borderLeft: `3px solid ${statusColors[rfq.status] || '#94A3B8'}`,
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.06)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{rfq.rfq_number}</div>
                  <Badge status={rfq.status} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.3 }}>{rfq.title}</div>
                {rfq.description && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rfq.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />{rfq.vendor_count || 0} vendors
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={11} />{rfq.quotation_count || 0} quotes
                  </div>
                  {rfq.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />Due {formatDate(rfq.deadline)}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  By {rfq.created_by_name} · {formatDate(rfq.created_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New RFQ" size="lg">
        <RFQForm onSubmit={handleCreate} loading={submitting} />
      </Modal>
    </Layout>
  );
}
