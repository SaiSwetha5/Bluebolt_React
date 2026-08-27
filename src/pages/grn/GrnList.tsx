import { useData } from '../../store/DataContext';

export default function GrnList() {
  const { vendorGrns, vendorPurchaseOrders } = useData();

  const getPo = (poId: string) => vendorPurchaseOrders.find(p => p.id === poId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GRN List</h1>
        <p className="text-slate-500 text-sm">{vendorGrns.length} total GRNs</p>
      </div>

      <div className="a360-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="a360-th">GRN ID</th>
              <th className="a360-th">PO Number</th>
              <th className="a360-th">Vendor</th>
              <th className="a360-th">Date</th>
              <th className="a360-th">Lines</th>
              <th className="a360-th">Grand Total</th>
              <th className="a360-th">Status</th>
              <th className="a360-th">Created By</th>
              <th className="a360-th">Approved/Rejected By</th>
            </tr>
          </thead>
          <tbody>
            {vendorGrns.length === 0 && (
              <tr><td colSpan={9} className="a360-td text-center text-slate-400 py-8">No GRNs yet.</td></tr>
            )}
            {vendorGrns.map(grn => {
              const po = getPo(grn.poId);
              return (
                <tr key={grn.id} className="hover:bg-slate-50">
                  <td className="a360-td font-mono text-xs">{grn.id}</td>
                  <td className="a360-td font-mono text-sm font-semibold">{grn.poNumber}</td>
                  <td className="a360-td text-sm">{po?.vendorName ?? '—'}</td>
                  <td className="a360-td text-xs">{new Date(grn.grnDate).toLocaleDateString()}</td>
                  <td className="a360-td">{grn.lines.length}</td>
                  <td className="a360-td font-semibold">
                    {grn.grandTotal.toLocaleString()} {po?.poCurrency}
                    <span className="text-xs text-slate-400 block">{grn.grandTotalLocal.toLocaleString()} {po?.localCurrency}</span>
                  </td>
                  <td className="a360-td">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${grn.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : grn.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {grn.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="a360-td text-xs">{grn.createdBy}</td>
                  <td className="a360-td text-xs">
                    {grn.approvedBy ? <span className="text-emerald-700">{grn.approvedBy}</span> : grn.rejectedBy ? <span className="text-rose-700">{grn.rejectedBy}</span> : '—'}
                    {grn.rejectedReason && <span className="block text-rose-400 italic">{grn.rejectedReason}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
