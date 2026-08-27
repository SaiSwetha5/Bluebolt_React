import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import type { GrnLineDetail } from '../../types/models';

interface LineFormState {
  lineItemId: string; itemName: string; poQty: number; rate: number;
  grnQty: string; alreadyGrnQty: number;
  leaseStart: string; leaseEnd: string;
  serialNumbers: string;
}

export default function GrnEntry() {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendorPo, grnsForPo, alreadyGrnQty, createVendorGrn } = useData();

  const po = vendorPo(poId!);
  const existingGrns = poId ? grnsForPo(poId) : [];

  const initialLines = useMemo<LineFormState[]>(() => {
    if (!po) return [];
    return po.lineItems.map(li => ({
      lineItemId: li.id, itemName: li.itemName, poQty: li.poQty, rate: li.rate,
      grnQty: '',
      alreadyGrnQty: alreadyGrnQty(po.id, li.id),
      leaseStart: '', leaseEnd: '', serialNumbers: ''
    }));
  }, [po]);

  const [lines, setLines] = useState<LineFormState[]>(initialLines);
  const [createdBy, setCreatedBy] = useState('Sandeep Lacheta');
  const [submitted, setSubmitted] = useState(false);

  if (!po) return <div className="text-slate-500 p-8">Vendor PO not found.</div>;

  function updateLine(idx: number, patch: Partial<LineFormState>) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  const grandTotal = lines.reduce((sum, l) => sum + (parseInt(l.grnQty || '0', 10) * l.rate), 0);
  const grandTotalLocal = Math.round(grandTotal * (po?.exchangeRate ?? 1));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!po) return;
    createVendorGrn({
      poId: po.id,
      createdBy,
      lines: lines.map(l => {
        const qty = parseInt(l.grnQty || '0', 10);
        const serials = l.serialNumbers.split('\n').map(s => s.trim()).filter(Boolean);
        const details: GrnLineDetail = { serialNumbers: serials, leaseStart: l.leaseStart || undefined, leaseEnd: l.leaseEnd || undefined };
        return { lineItemId: l.lineItemId, itemName: l.itemName, poQty: l.poQty, grnQty: qty, rate: l.rate, details };
      }),
    });
    setSubmitted(true);
    setTimeout(() => navigate('/procurement/grn-approval'), 800);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <button onClick={() => navigate('/procurement/vendor-po')} className="text-sm text-brand-600 hover:underline mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Vendor PO List
        </button>
        <h1 className="text-2xl font-bold text-slate-900">GRN Entry</h1>
        <p className="text-slate-500 text-sm">{po.poNumber} — {po.vendorName}</p>
      </div>

      {/* PO Header */}
      <div className="a360-card p-5 grid grid-cols-3 gap-4">
        <div><span className="a360-label">PO Number</span><p className="text-sm font-semibold">{po.poNumber}</p></div>
        <div><span className="a360-label">PO Date</span><p className="text-sm">{po.poDate}</p></div>
        <div><span className="a360-label">Vendor</span><p className="text-sm">{po.vendorName}</p></div>
        <div><span className="a360-label">PO Value</span><p className="text-sm font-semibold">{po.poValue.toLocaleString()} {po.poCurrency}</p></div>
        <div><span className="a360-label">Exchange Rate</span><p className="text-sm">1 {po.poCurrency} = {po.exchangeRate} {po.localCurrency}</p></div>
        <div><span className="a360-label">Status</span><p className="text-sm">{po.status}</p></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {lines.map((line, idx) => {
          const remaining = Math.max(line.poQty - line.alreadyGrnQty, 0);
          const qty = parseInt(line.grnQty || '0', 10);
          return (
            <div key={line.lineItemId} className="a360-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{line.itemName}</p>
                  <p className="text-xs text-slate-500">PO Qty: {line.poQty.toLocaleString()} · Already GRN'd: {line.alreadyGrnQty} · Remaining: {remaining} · Rate: {line.rate.toLocaleString()} {po.poCurrency}</p>
                </div>
                {qty > 0 && <span className="text-sm font-semibold text-brand-600">{(qty * line.rate).toLocaleString()} {po.poCurrency}</span>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="a360-label">GRN Qty</label>
                  <input type="number" min="0" max={remaining} value={line.grnQty}
                    onChange={e => updateLine(idx, { grnQty: e.target.value })}
                    className="a360-input" placeholder={`Max ${remaining}`} />
                </div>
                <div>
                  <label className="a360-label">Lease Start</label>
                  <input type="date" value={line.leaseStart} onChange={e => updateLine(idx, { leaseStart: e.target.value })} className="a360-input" />
                </div>
                <div>
                  <label className="a360-label">Lease End</label>
                  <input type="date" value={line.leaseEnd} onChange={e => updateLine(idx, { leaseEnd: e.target.value })} className="a360-input" />
                </div>
              </div>

              {qty > 0 && (
                <div className="mt-3">
                  <label className="a360-label">Serial Numbers (one per line, optional)</label>
                  <textarea
                    value={line.serialNumbers}
                    onChange={e => updateLine(idx, { serialNumbers: e.target.value })}
                    rows={Math.min(qty, 5)}
                    className="a360-input font-mono text-xs"
                    placeholder={`Enter up to ${qty} serial numbers, one per line`}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Grand total */}
        <div className="a360-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Grand Total</p>
            <p className="text-2xl font-bold text-slate-900">{grandTotal.toLocaleString()} {po.poCurrency}</p>
            <p className="text-sm text-slate-500">{grandTotalLocal.toLocaleString()} {po.localCurrency}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div>
              <label className="a360-label">Created By</label>
              <input value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="a360-input w-52" />
            </div>
            <button type="submit" disabled={submitted || grandTotal === 0} className="a360-btn-primary">
              {submitted ? 'Submitted…' : 'Submit GRN for Approval'}
            </button>
          </div>
        </div>
      </form>

      {/* Existing GRNs */}
      {existingGrns.length > 0 && (
        <div className="a360-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-800">Previous GRNs for this PO</div>
          <table className="w-full">
            <thead><tr><th className="a360-th">GRN ID</th><th className="a360-th">Date</th><th className="a360-th">Lines</th><th className="a360-th">Grand Total</th><th className="a360-th">Status</th><th className="a360-th">Created By</th></tr></thead>
            <tbody>
              {existingGrns.map(g => (
                <tr key={g.id}>
                  <td className="a360-td font-mono text-xs">{g.id}</td>
                  <td className="a360-td text-xs">{new Date(g.grnDate).toLocaleDateString()}</td>
                  <td className="a360-td">{g.lines.length}</td>
                  <td className="a360-td font-semibold">{g.grandTotal.toLocaleString()} {po.poCurrency}</td>
                  <td className="a360-td"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${g.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : g.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{g.status.replace('_', ' ')}</span></td>
                  <td className="a360-td text-xs">{g.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
