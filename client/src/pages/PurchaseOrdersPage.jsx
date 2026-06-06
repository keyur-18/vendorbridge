import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { purchaseOrdersAPI, invoicesAPI, vendorsAPI, rfqsAPI } from '../api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { LoadingSpinner, EmptyState, formatDate, formatCurrency } from '../components/ui';
import { ShoppingBag, Plus, Eye, FileText, Package, Building2, Search } from 'lucide-react';

function CreatePOForm({ onSubmit, loading }) {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    vendor_id: '', delivery_address: '', terms: '', tax_rate: 18,
    items: [{ product_name: '', quantity: 1, unit: 'units', unit_price: '' }]
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    vendorsAPI.getAll({ status: 'active', limit: 100 }).then(res => setVendors(res.data.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleItemChange = (i, field, val) => {
    setForm(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { product_name: '', quantity: 1, unit: 'units', unit_price: '' }] }));
  const removeItem = (i) => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((sum, item) => sum + (parseFloat(item.quantity) * (parseFloat(item.unit_price) || 0)), 0);
  const taxAmount = (subtotal * parseFloat(form.tax_rate || 0)) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.vendor_id) errs.vendor_id = 'Vendor is required';
    if (!form.delivery_address) errs.delivery_address = 'Delivery address is required';
    if (form.items.some(i => !i.product_name || !i.unit_price)) errs.items = 'All items need a name and price';
    if (Object.keys(errs).length > 0) return setErrors(errs);

    onSubmit({
      ...form,
      tax_rate: parseFloat(form.tax_rate),
      items: form.items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) }))
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">Vendor *</label>
        <select name="vendor_id" className="input-field" value={form.vendor_id} onChange={handleChange}>
          <option value="">Select vendor...</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
        </select>
        {errors.vendor_id && <div className="error-text">{errors.vendor_id}</div>}
      </div>
      <div>
        <label className="label">Delivery Address *</label>
        <textarea name="delivery_address" className="input-field" rows={2} value={form.delivery_address} onChange={handleChange} placeholder="Full delivery address..." style={{ resize: 'vertical' }} />
        {errors.delivery_address && <div className="error-text">{errors.delivery_address}</div>}
      </div>
      <div className="form-grid-2">
        <div>
          <label className="label">Terms</label>
          <input name="terms" className="input-field" placeholder="Payment / delivery terms" value={form.terms} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Tax Rate (%)</label>
          <input name="tax_rate" type="number" className="input-field" min="0" max="100" value={form.tax_rate} onChange={handleChange} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="label" style={{ margin: 0 }}>Line Items *</label>
          <button type="button" onClick={addItem} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
            <Plus size={12} /> Add Item
          </button>
        </div>
        {errors.items && <div className="error-text" style={{ marginBottom: 8 }}>{errors.items}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input-field" style={{ flex: 2, padding: '7px 10px' }} placeholder="Product name" value={item.product_name} onChange={e => handleItemChange(i, 'product_name', e.target.value)} />
              <input type="number" className="input-field" style={{ width: 70, padding: '7px 10px' }} placeholder="Qty" min="0.01" step="0.01" value={item.quantity} onChange={e => handleItemChange(i, 'quantity', e.target.value)} />
              <select className="input-field" style={{ width: 80, padding: '7px 8px' }} value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)}>
                <option value="units">Units</option><option value="kg">KG</option><option value="boxes">Boxes</option><option value="hours">Hours</option><option value="license">License</option>
              </select>
              <input type="number" className="input-field" style={{ width: 120, padding: '7px 10px', textAlign: 'right' }} placeholder="Unit Price" min="0.01" step="0.01" value={item.unit_price} onChange={e => handleItemChange(i, 'unit_price', e.target.value)} />
              <div style={{ width: 100, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--color-primary-light)', flexShrink: 0 }}>
                {formatCurrency(parseFloat(item.quantity) * (parseFloat(item.unit_price) || 0))}
              </div>
              {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--color-danger)', flexShrink: 0 }}>✕</button>}
            </div>
          ))}
        </div>

        {/* Totals Summary */}
        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Tax ({form.tax_rate}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: 'var(--color-primary-light)', borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  );
}

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchaseOrdersAPI.getAll(filter ? { status: filter } : {});
      setPOs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      const res = await purchaseOrdersAPI.create(data);
      toast.success('Purchase Order created!');
      setShowModal(false);
      navigate(`/purchase-orders/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">{total} purchase orders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Create PO
        </button>
      </div>

      {/* Filter */}
      <div className="card-sm" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['', 'draft', 'issued', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: filter === s ? 'var(--color-primary)' : 'transparent',
            color: filter === s ? 'white' : 'var(--color-text-muted)',
            transition: 'all 0.2s'
          }}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><LoadingSpinner /></div>
        ) : pos.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No purchase orders" description="Create your first purchase order" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th><th>Vendor</th><th>RFQ Reference</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: 13 }}>{po.po_number}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{po.vendor_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{po.vendor_email}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{po.rfq_number || '—'}</td>
                    <td style={{ fontSize: 13 }}>{formatCurrency(po.subtotal)}</td>
                    <td style={{ fontSize: 13 }}>{formatCurrency(po.tax_amount)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{formatCurrency(po.total_amount)}</td>
                    <td><Badge status={po.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(po.issued_at)}</td>
                    <td>
                      <Link to={`/purchase-orders/${po.id}`} style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Purchase Order" size="xl">
        <CreatePOForm onSubmit={handleCreate} loading={submitting} />
      </Modal>
    </Layout>
  );
}
