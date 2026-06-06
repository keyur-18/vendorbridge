import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rfqsAPI, approvalsAPI } from '../api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, formatCurrency } from '../components/ui';
import { ArrowLeft, Trophy, Star, Clock, TrendingDown, CheckCircle } from 'lucide-react';

export default function QuotationComparePage() {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [rfqRes, quotesRes] = await Promise.all([
          rfqsAPI.getById(rfqId),
          rfqsAPI.getQuotations(rfqId),
        ]);
        setRfq(rfqRes.data.data);
        setQuotations(quotesRes.data.data.filter(q => ['submitted', 'revised', 'accepted'].includes(q.status)));
      } catch (err) {
        toast.error('Failed to load comparison data');
        navigate(`/rfqs/${rfqId}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rfqId]);

  const handleSelectWinner = async (quotation) => {
    if (!confirm(`Select ${quotation.company_name}'s quotation as the preferred vendor?`)) return;
    setSubmitting(true);
    try {
      await approvalsAPI.create({ rfq_id: rfqId, quotation_id: quotation.id });
      toast.success('Quotation selected and approval requested!');
      navigate(`/rfqs/${rfqId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to select quotation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;

  const minPrice = quotations.length > 0 ? Math.min(...quotations.map(q => parseFloat(q.total_amount))) : 0;
  const minDelivery = quotations.length > 0 ? Math.min(...quotations.map(q => q.delivery_days)) : 0;
  const maxRating = quotations.length > 0 ? Math.max(...quotations.map(q => parseFloat(q.rating || 0))) : 0;

  const allItems = rfq?.items || [];

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(`/rfqs/${rfqId}`)} className="btn-secondary" style={{ padding: '8px 10px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Quotation Comparison</h1>
          <p className="page-subtitle">{rfq?.rfq_number} — {rfq?.title}</p>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          No quotations available for comparison
        </div>
      ) : (
        <>
          {/* Comparison Legend */}
          <div className="card-sm" style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Best Value</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <TrendingDown size={12} color="var(--color-success)" />
              <span style={{ color: 'var(--color-text-muted)' }}>Lowest Price</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Clock size={12} color="var(--color-info)" />
              <span style={{ color: 'var(--color-text-muted)' }}>Fastest Delivery</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <span style={{ color: 'var(--color-text-muted)' }}>Highest Rated</span>
            </div>
          </div>

          {/* Side-by-side comparison table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'rgba(15,118,110,0.05)' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', width: 180 }}>
                    Criteria
                  </th>
                  {quotations.map(q => (
                    <th key={q.id} style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{q.company_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                        <Star size={11} color="#F59E0B" fill="#F59E0B" />
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{parseFloat(q.rating || 0).toFixed(1)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Total Price Row */}
                <tr>
                  <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingDown size={13} color="var(--color-success)" /> Total Price
                    </div>
                  </td>
                  {quotations.map(q => {
                    const isLowest = parseFloat(q.total_amount) === minPrice;
                    return (
                      <td key={q.id} style={{
                        padding: '14px 16px', textAlign: 'center',
                        borderBottom: '1px solid rgba(51,65,85,0.4)',
                        borderLeft: '1px solid var(--color-border)',
                        background: isLowest ? 'rgba(34,197,94,0.05)' : undefined
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: isLowest ? 'var(--color-success)' : 'var(--color-text)' }}>
                          {formatCurrency(q.total_amount)}
                        </div>
                        {isLowest && <div style={{ fontSize: 10, color: 'var(--color-success)', fontWeight: 600, marginTop: 2 }}>
                          <Trophy size={10} style={{ marginRight: 2 }} />LOWEST PRICE
                        </div>}
                      </td>
                    );
                  })}
                </tr>

                {/* Delivery Row */}
                <tr>
                  <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="var(--color-info)" /> Delivery Time
                    </div>
                  </td>
                  {quotations.map(q => {
                    const isFastest = q.delivery_days === minDelivery;
                    return (
                      <td key={q.id} style={{
                        padding: '14px 16px', textAlign: 'center',
                        borderBottom: '1px solid rgba(51,65,85,0.4)',
                        borderLeft: '1px solid var(--color-border)',
                        background: isFastest ? 'rgba(59,130,246,0.05)' : undefined
                      }}>
                        <div style={{ fontWeight: 700, color: isFastest ? 'var(--color-info)' : 'var(--color-text)' }}>
                          {q.delivery_days} days
                        </div>
                        {isFastest && <div style={{ fontSize: 10, color: 'var(--color-info)', fontWeight: 600, marginTop: 2 }}>FASTEST</div>}
                      </td>
                    );
                  })}
                </tr>

                {/* Rating Row */}
                <tr>
                  <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={13} color="#F59E0B" fill="#F59E0B" /> Vendor Rating
                    </div>
                  </td>
                  {quotations.map(q => {
                    const isTop = parseFloat(q.rating || 0) === maxRating && maxRating > 0;
                    return (
                      <td key={q.id} style={{
                        padding: '14px 16px', textAlign: 'center',
                        borderBottom: '1px solid rgba(51,65,85,0.4)',
                        borderLeft: '1px solid var(--color-border)',
                        background: isTop ? 'rgba(245,158,11,0.05)' : undefined
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={13} color="#F59E0B" fill={star <= Math.round(parseFloat(q.rating || 0)) ? '#F59E0B' : 'transparent'} />
                          ))}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>{parseFloat(q.rating || 0).toFixed(1)}/5</div>
                      </td>
                    );
                  })}
                </tr>

                {/* Per Item Rows */}
                {allItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '12px 20px', fontSize: 13, borderBottom: '1px solid rgba(51,65,85,0.4)', color: 'var(--color-text-muted)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{item.product_name}</div>
                      <div style={{ fontSize: 11 }}>Qty: {item.quantity} {item.unit}</div>
                    </td>
                    {quotations.map(q => {
                      const qItem = q.items?.find(i => i.rfq_item_id === item.id || i.product_name === item.product_name);
                      const itemPrices = quotations.map(qq => {
                        const qi = qq.items?.find(i => i.rfq_item_id === item.id || i.product_name === item.product_name);
                        return qi ? parseFloat(qi.unit_price) : Infinity;
                      });
                      const minItemPrice = Math.min(...itemPrices.filter(p => p !== Infinity));
                      const isItemLowest = qItem && parseFloat(qItem.unit_price) === minItemPrice;
                      return (
                        <td key={q.id} style={{
                          padding: '12px 16px', textAlign: 'center',
                          borderBottom: '1px solid rgba(51,65,85,0.4)',
                          borderLeft: '1px solid var(--color-border)',
                          background: isItemLowest ? 'rgba(34,197,94,0.04)' : undefined
                        }}>
                          {qItem ? (
                            <>
                              <div style={{ fontWeight: 600, color: isItemLowest ? 'var(--color-success)' : 'var(--color-text)', fontSize: 13 }}>
                                {formatCurrency(qItem.unit_price)}/unit
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatCurrency(qItem.total_price)} total</div>
                            </>
                          ) : (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Notes Row */}
                <tr>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>Notes / Terms</td>
                  {quotations.map(q => (
                    <td key={q.id} style={{ padding: '12px 16px', textAlign: 'center', borderLeft: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: q.notes ? 'italic' : 'normal' }}>
                      {q.notes || '—'}
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr style={{ background: 'rgba(15,118,110,0.03)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13 }}>Select Vendor</td>
                  {quotations.map(q => (
                    <td key={q.id} style={{ padding: '12px 16px', textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                      {q.status === 'accepted' ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-success)', fontWeight: 600, fontSize: 12 }}>
                          <CheckCircle size={14} /> Selected
                        </div>
                      ) : (
                        <button onClick={() => handleSelectWinner(q)} className="btn-primary" disabled={submitting} style={{ padding: '6px 14px', fontSize: 12 }}>
                          Select
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
