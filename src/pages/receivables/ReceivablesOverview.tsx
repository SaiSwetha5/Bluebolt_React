import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

// Finance-facing rollup across all customer subscriptions — mirrors the
// Invoices & Lease view on the payable side, for the receivable side.
export default function ReceivablesOverview() {
  const { receivableInvoices, receipts } = useData();
  const outstanding = receivableInvoices.filter(i => i.status !== 'PAID');
  const collected = receipts.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Receivables Overview</h1>
        <p className="text-sm text-slate-500">Customer invoices and receipts across all DaaS subscriptions.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Outstanding Invoices</p><p className="text-2xl font-bold text-slate-800">{outstanding.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Total Collected</p><p className="text-2xl font-bold text-emerald-600">${collected.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Total Invoices Issued</p><p className="text-2xl font-bold text-slate-800">{receivableInvoices.length}</p></div>
      </div>

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Invoice</th><th className="a360-th">Subscription</th><th className="a360-th">Customer</th>
            <th className="a360-th">Period</th><th className="a360-th">Amount</th><th className="a360-th">Due</th><th className="a360-th">Status</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {receivableInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                <td className="a360-td text-slate-500">{inv.subscriptionId}</td>
                <td className="a360-td">{inv.customerName}</td>
                <td className="a360-td">{inv.period}</td>
                <td className="a360-td">${inv.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td className="a360-td text-slate-500">{inv.dueDate}</td>
                <td className="a360-td"><StatusBadge status={inv.status} /></td>
                <td className="a360-td text-right"><Link to={`/receivables/subscriptions/${inv.subscriptionId}`} className="a360-btn-secondary !py-1 !px-2 text-xs">Open</Link></td>
              </tr>
            ))}
            {!receivableInvoices.length && <tr><td colSpan={8} className="a360-td text-center text-slate-400 py-8">No invoices issued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
