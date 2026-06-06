import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../api';
import { invoicesAtom, invoiceFiltersAtom, authUserAtom } from '../atoms';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, EmptyState, formatDate, formatCurrency } from '../components/ui';
import { Receipt, Download, Mail, Eye, CheckCircle } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useRecoilState(invoicesAtom);
  const [filter, setFilter] = useRecoilState(invoiceFiltersAtom);
  const user = useRecoilValue(authUserAtom);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesAPI.getAll(filter ? { status: filter } : {});
      setInvoices(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filter, setInvoices]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (inv) => {
    setActionLoading(p => ({ ...p, [inv.id + '_dl']: true }));
    try {
      const res = await invoicesAPI.getPDF(inv.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${inv.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(p => ({ ...p, [inv.id + '_dl']: false }));
    }
  };

  const handleSend = async (inv) => {
    setActionLoading(p => ({ ...p, [inv.id + '_email']: true }));
    try {
      await invoicesAPI.sendEmail(inv.id);
      toast.success(`Invoice sent to vendor!`);
      load();
    } catch (err) {
      toast.error('Failed to send email');
    } finally {
      setActionLoading(p => ({ ...p, [inv.id + '_email']: false }));
    }
  };

  const handleMarkPaid = async (inv) => {
    try {
      await invoicesAPI.updateStatus(inv.id, 'paid');
      toast.success('Invoice marked as paid!');
      load();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{total} invoices total</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {[
          { value: '', label: 'All' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            color: filter === value ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
            borderBottom: filter === value ? '2px solid var(--color-primary-light)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s'
          }}>{label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><LoadingSpinner /></div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices found" description="Invoices are created from Purchase Orders" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th><th>PO Reference</th><th>Vendor</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Due Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: 13, textDecoration: 'none' }}>
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{inv.po_number}</td>
                    <td style={{ fontWeight: 500 }}>{inv.vendor_name}</td>
                    <td>{formatCurrency(inv.subtotal)}</td>
                    <td>{formatCurrency(inv.tax_amount)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{formatCurrency(inv.total_amount)}</td>
                    <td style={{ fontSize: 12, color: inv.due_date && new Date(inv.due_date) < new Date() ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {formatDate(inv.due_date)}
                    </td>
                    <td><Badge status={inv.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/invoices/${inv.id}`} title="View" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--color-primary-light)', display: 'flex' }}>
                          <Eye size={12} />
                        </Link>
                        <button onClick={() => handleDownload(inv)} title="Download PDF" disabled={actionLoading[inv.id + '_dl']} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--color-info)', display: 'flex' }}>
                          <Download size={12} />
                        </button>
                        {inv.status !== 'paid' && ['admin', 'procurement_officer'].includes(user?.role) && (
                          <button onClick={() => handleSend(inv)} title="Send Email" disabled={actionLoading[inv.id + '_email']} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--color-warning)', display: 'flex' }}>
                            <Mail size={12} />
                          </button>
                        )}
                        {inv.status === 'sent' && ['admin', 'procurement_officer'].includes(user?.role) && (
                          <button onClick={() => handleMarkPaid(inv)} title="Mark as Paid" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--color-success)', display: 'flex' }}>
                            <CheckCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
