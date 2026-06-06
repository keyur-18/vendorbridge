import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import { purchaseOrdersAPI, invoicesAPI } from '../api';
import { authUserAtom } from '../atoms';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, formatDate, formatCurrency } from '../components/ui';
import { ArrowLeft, FileText, Printer, Mail, Download, Plus, Building2, MapPin } from 'lucide-react';

export default function PODetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useRecoilValue(authUserAtom);
  const [po, setPO] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrdersAPI.getById(id);
      setPO(res.data.data);
      const invRes = await invoicesAPI.getAll({ page: 1, limit: 100 });
      const inv = invRes.data.data.find(i => i.po_id === id);
      if (inv) setInvoice(inv);
    } catch (err) {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCreateInvoice = async () => {
    setCreating(true);
    try {
      const res = await invoicesAPI.create({ po_id: id });
      toast.success('Invoice created!');
      setInvoice(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await purchaseOrdersAPI.getPDF(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${po.po_number || 'purchase_order'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PO PDF downloaded!');
    } catch (err) {
      toast.error('Failed to download PO PDF');
    }
  };

  const handlePrint = () => window.print();

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await purchaseOrdersAPI.sendEmail(id);
      toast.success('Purchase Order sent via email!');
      load();
    } catch (err) {
      toast.error('Failed to send PO email');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;
  if (!po) return null;

  const isProcurementOrAdmin = ['admin', 'procurement_officer'].includes(user?.role);

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary" style={{ padding: '8px 10px' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{po.po_number}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge status={po.status} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Issued: {formatDate(po.issued_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handleDownloadPDF} title="Download PO PDF">
            <Download size={14} /> PDF
          </button>
          <button className="btn-secondary" onClick={handlePrint} title="Print">
            <Printer size={14} /> Print
          </button>
          {isProcurementOrAdmin && (
            <button className="btn-primary" onClick={handleSendEmail} disabled={sending} title="Send via Email">
              {sending ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Mail size={14} />Send Email</>}
            </button>
          )}
          {!invoice && isProcurementOrAdmin && (
            <button className="btn-primary" onClick={handleCreateInvoice} disabled={creating}>
              {creating ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><FileText size={14} />Generate Invoice</>}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Banner */}
      {invoice && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={16} color="var(--color-success)" />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{invoice.invoice_number}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>Invoice generated</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge status={invoice.status} />
            <Link to={`/invoices/${invoice.id}`} style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none' }}>View Invoice →</Link>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* PO Header Document Style */}
          <div className="card" id="po-print-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid var(--color-primary-light)' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary-light)', marginBottom: 4 }}>PURCHASE ORDER</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', fontFamily: 'monospace' }}>{po.po_number}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)', marginBottom: 4 }}>VendorBridge</div>
                <div style={{ color: 'var(--color-text-muted)' }}>Procurement & Vendor Management ERP</div>
                <div style={{ marginTop: 8, color: 'var(--color-text-muted)' }}>Date: {formatDate(po.issued_at)}</div>
                <div style={{ color: 'var(--color-text-muted)' }}>Ref: {po.rfq_number || '—'}</div>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: 24 }}>
              <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Vendor</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{po.company_name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{po.vendor_email}</div>
                {po.vendor_phone && <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{po.vendor_phone}</div>}
                {po.gst_number && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>GST: {po.gst_number}</div>}
              </div>
              <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Deliver To</div>
                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>{po.delivery_address || '—'}</div>
                {po.terms && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>Terms: {po.terms}</div>}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.15), rgba(20,184,166,0.08))' }}>
                  {['#', 'Product / Service', 'Qty', 'Unit', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' || h === 'Qty' ? 'center' : h === 'Unit Price' || h === 'Total' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.items?.map((item, i) => (
                  <tr key={item.id} style={{ background: i % 2 === 1 ? 'rgba(15,118,110,0.02)' : undefined }}>
                    <td style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid rgba(51,65,85,0.3)', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>{item.quantity}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid rgba(51,65,85,0.3)', color: 'var(--color-text-muted)', fontSize: 11 }}>{item.unit}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', borderBottom: '1px solid rgba(51,65,85,0.3)', fontWeight: 600 }}>{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: 'var(--color-text-muted)' }}>Subtotal</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(po.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: 'var(--color-text-muted)' }}>GST ({po.tax_rate}%)</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(po.tax_amount)}</td>
                </tr>
                <tr style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.1), rgba(20,184,166,0.05))' }}>
                  <td colSpan={5} style={{ padding: '14px', textAlign: 'right', fontSize: 16, fontWeight: 800, color: 'var(--color-primary-light)' }}>TOTAL AMOUNT</td>
                  <td style={{ padding: '14px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: 'var(--color-primary-light)' }}>{formatCurrency(po.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Order Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Items', value: `${po.items?.length || 0} line items` },
                { label: 'Subtotal', value: formatCurrency(po.subtotal) },
                { label: `Tax (${po.tax_rate}%)`, value: formatCurrency(po.tax_amount) },
                { label: 'Created By', value: po.created_by_name },
                { label: 'Issued Date', value: formatDate(po.issued_at) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-primary-light)' }}>{formatCurrency(po.total_amount)}</span>
              </div>
            </div>
          </div>

          {po.rfq_number && (
            <Link to={`/rfqs/${po.rfq_id}`} className="btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              <FileText size={14} /> View RFQ
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
}
