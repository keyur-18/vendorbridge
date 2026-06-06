import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { vendorsAPI } from '../api';
import { vendorSchema } from '../schemas';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { LoadingSpinner, EmptyState } from '../components/ui';
import { Search, Plus, Building2, Phone, Mail, MapPin, Star, Edit2, Trash2, Filter, RefreshCw } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Office Supplies', 'IT Services', 'Logistics', 'Furniture', 'Stationery', 'Hardware', 'Software', 'Other'];

function VendorForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || {
    company_name: '', category: '', gst_number: '', contact_person: '',
    phone: '', email: '', address: '', city: '', state: '', pincode: '', notes: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = vendorSchema.safeParse(form);
    if (!result.success) {
      const errs = {};
      result.error.errors.forEach(e => { errs[e.path[0]] = e.message; });
      return setErrors(errs);
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-grid-2">
        <div>
          <label className="label">Company Name *</label>
          <input name="company_name" className="input-field" placeholder="Acme Corp" value={form.company_name} onChange={handleChange} />
          {errors.company_name && <div className="error-text">{errors.company_name}</div>}
        </div>
        <div>
          <label className="label">Category</label>
          <select name="category" className="input-field" value={form.category} onChange={handleChange}>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid-2">
        <div>
          <label className="label">Contact Person *</label>
          <input name="contact_person" className="input-field" placeholder="John Doe" value={form.contact_person} onChange={handleChange} />
          {errors.contact_person && <div className="error-text">{errors.contact_person}</div>}
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" className="input-field" placeholder="vendor@company.com" value={form.email} onChange={handleChange} />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>
      </div>
      <div className="form-grid-2">
        <div>
          <label className="label">Phone</label>
          <input name="phone" className="input-field" placeholder="+91-9876543210" value={form.phone} onChange={handleChange} />
          {errors.phone && <div className="error-text">{errors.phone}</div>}
        </div>
        <div>
          <label className="label">GST Number</label>
          <input name="gst_number" className="input-field" placeholder="29ABCDE1234F1Z5" value={form.gst_number} onChange={handleChange} style={{ textTransform: 'uppercase' }} />
          {errors.gst_number && <div className="error-text">{errors.gst_number}</div>}
        </div>
      </div>
      <div>
        <label className="label">Address</label>
        <input name="address" className="input-field" placeholder="Street address" value={form.address} onChange={handleChange} />
      </div>
      <div className="form-grid-3">
        <div>
          <label className="label">City</label>
          <input name="city" className="input-field" placeholder="Bangalore" value={form.city} onChange={handleChange} />
        </div>
        <div>
          <label className="label">State</label>
          <input name="state" className="input-field" placeholder="Karnataka" value={form.state} onChange={handleChange} />
        </div>
        <div>
          <label className="label">Pincode</label>
          <input name="pincode" className="input-field" placeholder="560001" value={form.pincode} onChange={handleChange} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" className="input-field" rows={2} placeholder="Additional notes..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (initial ? 'Update Vendor' : 'Create Vendor')}
        </button>
      </div>
    </form>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', status: '' });
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...filters };
      const res = await vendorsAPI.getAll(params);
      setVendors(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    setSubmitting(true);
    try {
      await vendorsAPI.create(data);
      toast.success('Vendor created!');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    try {
      await vendorsAPI.update(editVendor.id, data);
      toast.success('Vendor updated!');
      setEditVendor(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vendor) => {
    if (!confirm(`Delete "${vendor.company_name}"?`)) return;
    try {
      await vendorsAPI.delete(vendor.id);
      toast.success('Vendor deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete vendor');
    }
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const categoryColors = { Electronics: '#3B82F6', 'IT Services': '#8B5CF6', 'Office Supplies': '#F59E0B', Logistics: '#14B8A6', Furniture: '#22C55E', Other: '#94A3B8' };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">{total} vendors registered</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="card-sm" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input name="search" className="input-field" placeholder="Search vendors..." value={filters.search} onChange={handleFilterChange} style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }} />
        </div>
        <select name="category" className="input-field" value={filters.category} onChange={handleFilterChange} style={{ width: 160 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="status" className="input-field" value={filters.status} onChange={handleFilterChange} style={{ width: 130 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={load} className="btn-secondary" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><LoadingSpinner /></div>
        ) : vendors.length === 0 ? (
          <EmptyState icon={Building2} title="No vendors found" description="Add your first vendor to get started" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Contact</th>
                  <th>GST Number</th>
                  <th>Location</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: `${categoryColors[v.category] || '#94A3B8'}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: categoryColors[v.category] || '#94A3B8'
                        }}>
                          {v.company_name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{v.company_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={10} />{v.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 8px', background: `${categoryColors[v.category] || '#94A3B8'}18`, color: categoryColors[v.category] || '#94A3B8', borderRadius: 6 }}>
                        {v.category || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{v.contact_person}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={10} />{v.phone || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{v.gst_number || '—'}</td>
                    <td>
                      <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                        <MapPin size={10} />{[v.city, v.state].filter(Boolean).join(', ') || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{parseFloat(v.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td><Badge status={v.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditVendor(v)} style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--color-primary-light)' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(v)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--color-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Vendor" size="lg">
        <VendorForm onSubmit={handleCreate} loading={submitting} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editVendor} onClose={() => setEditVendor(null)} title="Edit Vendor" size="lg">
        {editVendor && <VendorForm initial={editVendor} onSubmit={handleUpdate} loading={submitting} />}
      </Modal>
    </Layout>
  );
}
