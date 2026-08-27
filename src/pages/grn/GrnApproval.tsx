import { useState } from 'react';
import { useData } from '../../store/DataContext';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function GrnApproval() {
  const { vendorGrns, vendorPurchaseOrders, approveVendorGrn, rejectVendorGrn } = useData();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getPo = (poId: string) => vendorPurchaseOrders.find(p => p.id === poId);

  const filtered = vendorGrns.filter(g => g.status === (tab === 'PENDING' ? 'PENDING_APPROVAL' : tab));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GRN Approval</h1>
        <p className="text-slate-500 text-sm">{vendorGrns.filter(g => g.status === 'PENDING_APPROVAL').length} pending</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(['PENDING', 'APPROVED', 'REJECTED'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="a360-card p-8 text-center text-slate-400">No GRNs in this status.</div>}
        {filtered.map(grn => {
          const po = getPo(grn.poId);
          return (
            <div key={grn.id} className="a360-card overflow-hidden">
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === grn.id ? null : grn.id)}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-slate-800">{grn.id}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-sm text-slate-600">{grn.poNumber}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-sm text-slate-600">{po?.vendorName}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${grn.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : grn.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {grn.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-4">
                    <span>Date: {new Date(grn.grnDate).toLocaleDateString()}</span>
                    <span>Lines: {grn.lines.length}</span>
                    <span>Grand Total: {grn.grandTotal.toLocaleString()} {po?.poCurrency} ({grn.grandTotalLocal.toLocaleString()} {po?.localCurrency})</span>
                    <span>By: {grn.createdBy}</span>
                  </div>
                </div>
                {tab === 'PENDING' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveVendorGrn(grn.id, 'A. Subramanian (Cognizant)')} className="a360-btn-primary text-sm py-1.5">Approve</button>
                    <button onClick={() => { setRejectModal(grn.id); setRejectReason(''); }} className="a360-btn-danger text-sm py-1.5">Reject</button>
                  </div>
                )}
              </div>

              {expandedId === grn.id && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <table className="w-full mt-3">
                    <thead>
                      <tr>
                        <th className="a360-th">Item</th>
                        <th className="a360-th">PO Qty</th>
                        <th className="a360-th">Already GRN'd</th>
                        <th className="a360-th">GRN Qty</th>
                        <th className="a360-th">Rate</th>
                        <th className="a360-th">Total</th>
                        <th className="a360-th">Serials</th>
                        <th className="a360-th">Lease</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grn.lines.map(l => (
                        <tr key={l.lineItemId}>
                          <td className="a360-td text-sm">{l.itemName}</td>
                          <td className="a360-td">{l.poQty.toLocaleString()}</td>
                          <td className="a360-td">{l.alreadyGrnQty}</td>
                          <td className="a360-td font-semibold">{l.grnQty}</td>
                          <td className="a360-td">{l.rate.toLocaleString()}</td>
                          <td className="a360-td font-semibold">{l.grnTotal.toLocaleString()}</td>
                          <td className="a360-td text-xs">
                            {l.details.serialNumbers.length ? (
                              <details>
                                <summary className="cursor-pointer text-brand-600">{l.details.serialNumbers.length} serial(s)</summary>
                                <div className="font-mono text-xs mt-1 max-h-20 overflow-y-auto">
                                  {l.details.serialNumbers.map(sn => <div key={sn}>{sn}</div>)}
                                </div>
                              </details>
                            ) : '—'}
                          </td>
                          <td className="a360-td text-xs">
                            {l.details.leaseStart ? `${l.details.leaseStart} → ${l.details.leaseEnd ?? '?'}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {grn.rejectedReason && (
                    <p className="mt-3 text-sm text-rose-600"><span className="font-semibold">Rejection reason:</span> {grn.rejectedReason}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-slate-900 mb-3">Reject GRN</h3>
            <label className="a360-label">Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="a360-input mb-4" placeholder="Enter rejection reason…" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="a360-btn-secondary">Cancel</button>
              <button onClick={() => { rejectVendorGrn(rejectModal, 'A. Subramanian (Cognizant)', rejectReason); setRejectModal(null); }} className="a360-btn-danger" disabled={!rejectReason.trim()}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
