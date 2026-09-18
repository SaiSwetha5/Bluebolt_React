import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

function fmt(ts: string) { return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

export default function GrnList() {
  const { goodsReceipts, invoices } = useData();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightId) highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Goods Receipt Notes (GRN)</h1>
        <p className="text-sm text-slate-500">Basis for Accounts Payable processing and 3-way invoice matching. GRN → Invoice → Lease → AP is traceable end to end via the Invoice column below.</p>
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">GRN</th><th className="a360-th">PO</th><th className="a360-th">Vendor Order</th>
            <th className="a360-th">Qty</th><th className="a360-th">Condition</th><th className="a360-th">POD</th>
            <th className="a360-th">Invoice</th><th className="a360-th">Received At</th>
          </tr></thead>
          <tbody>
            {goodsReceipts.map(g => {
              const invoice = invoices.find(i => i.grnId === g.id);
              const isHighlighted = g.id === highlightId;
              return (
                <tr key={g.id} ref={isHighlighted ? highlightRef : undefined} className={`hover:bg-slate-50 ${isHighlighted ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''}`}>
                  <td className="a360-td font-medium text-brand-700">{g.id}</td>
                  <td className="a360-td"><Link to={`/po/${g.poId}`} className="hover:underline text-slate-700">{g.poId}</Link></td>
                  <td className="a360-td">{g.vendorOrderId}</td>
                  <td className="a360-td">{g.quantityReceived}/{g.quantityExpected}</td>
                  <td className="a360-td"><StatusBadge status={g.condition} /></td>
                  <td className="a360-td text-slate-500">{g.podFileName || '—'}</td>
                  <td className="a360-td">
                    {invoice
                      ? <Link to={`/finance/invoices?highlight=${invoice.id}`} className="text-brand-700 hover:underline font-medium">{invoice.id}</Link>
                      : <span className="text-slate-400">Not yet invoiced</span>}
                  </td>
                  <td className="a360-td text-slate-500">{fmt(g.receivedAt)}</td>
                </tr>
              );
            })}
            {!goodsReceipts.length && <tr><td colSpan={8} className="a360-td text-center text-slate-400 py-8">No GRNs generated yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
