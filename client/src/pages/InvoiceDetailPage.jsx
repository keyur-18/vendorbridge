import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, formatDate, formatCurrency } from '../components/ui';
import { ArrowLeft, Download, Printer, Mail, CheckCircle, Building2 } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    invoicesAPI.getById(id).then(res => setInvoice(res.data.data)).catch(() => { toast.error('Not found'); navigate('/invoices'); }).finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try {
      const res = await invoicesAPI.getPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${invoice.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await invoicesAPI.sendEmail(id);
      toast.success('Invoice sent via email!');
      const res = await invoicesAPI.getById(id);
      setInvoice(res.data.data);
    } catch (err) {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      await invoicesAPI.updateStatus(id, 'paid');
      toast.success('Invoice marked as paid!');
      const res = await invoicesAPI.getById(id);
      setInvoice(res.data.data);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;
  if (!invoice) return null;

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/invoices')} className="btn-secondary" style={{ padding: '8px 10px' }}><ArrowLeft size={16} /></button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{invoice.invoice_number}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge status={invoice.status} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Created: {formatDate(invoice.created_at)}</span>
            {invoice.due_date && <span style={{ fontSize: 12, color: new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>Due: {formatDate(invoice.due_date)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handleDownload}><Download size={14} /> PDF</button>
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={14} /> Print</button>
          {invoice.status !== 'paid' && <button className="btn-primary" onClick={handleSendEmail} disabled={sending}>
            {sending ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Mail size={14} />Send Email</>}
          </button>}
          {invoice.status === 'sent' && <button className="btn-success" onClick={handleMarkPaid}><CheckCircle size={14} /> Mark Paid</button>}
        </div>
      </div>

      {/* Invoice Document */}
      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid var(--color-primary-light)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary-light)', marginBottom: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>Tax Invoice</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', fontFamily: 'monospace' }}>{invoice.invoice_number}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary-light)' }}>VendorBridge</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Procurement & Vendor Management ERP</div>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <div style={{ color: 'var(--color-text-muted)' }}>Invoice Date: <strong style={{ color: 'var(--color-text)' }}>{formatDate(invoice.created_at)}</strong></div>
              <div style={{ color: 'var(--color-text-muted)' }}>PO Reference: <strong style={{ color: 'var(--color-text)', fontFamily: 'monospace' }}>{invoice.po_number}</strong></div>
              {invoice.due_date && <div style={{ color: 'var(--color-text-muted)' }}>Due Date: <strong style={{ color: new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'var(--color-danger)' : 'var(--color-text)' }}>{formatDate(invoice.due_date)}</strong></div>}
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="form-grid-2" style={{ marginBottom: 28 }}>
          <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Bill To (Vendor)</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{invoice.company_name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              {invoice.vendor_email && <div>{invoice.vendor_email}</div>}
              {invoice.vendor_phone && <div>{invoice.vendor_phone}</div>}
              {invoice.vendor_address && <div>{invoice.vendor_address}</div>}
              {invoice.gst_number && <div style={{ marginTop: 6, fontSize: 12 }}>GST: <strong>{invoice.gst_number}</strong></div>}
            </div>
          </div>
          <div style={{ padding: 16, background: 'rgba(15,118,110,0.05)', borderRadius: 10, border: '1px solid rgba(20,184,166,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Invoice Summary</div>
            {[
              { label: 'Status', value: <Badge status={invoice.status} /> },
              { label: 'PO Number', value: invoice.po_number, mono: true },
              { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
              { label: `Tax (${invoice.tax_rate}%)`, value: formatCurrency(invoice.tax_amount) },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total Amount</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--color-primary-light)' }}>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={15} color="var(--color-primary-light)" />Line Items
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.12), rgba(20,184,166,0.06))' }}>
                {['#', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: ['Quantity', 'Rate', 'Amount'].includes(h) ? 'right' : '#' === h ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 1 ? 'rgba(15,118,110,0.02)' : undefined }}>
                  <td style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid rgba(51,65,85,0.3)', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)', color: 'var(--color-text-muted)', fontSize: 11 }}>{item.unit}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 600 }}>{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 280 }}>
            {[
              { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
              { label: `GST (${invoice.tax_rate}%)`, value: formatCurrency(invoice.tax_amount) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontSize: 18, fontWeight: 800, color: 'var(--color-primary-light)' }}>
              <span>Total Amount</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginTop: 20, padding: 14, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            <strong style={{ color: 'var(--color-text)', fontStyle: 'normal' }}>Notes: </strong>{invoice.notes}
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Thank you for your business — VendorBridge Procurement & Vendor Management ERP
        </div>
      </div>
    </Layout>
  );
}
