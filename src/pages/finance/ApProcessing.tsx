import { useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ApProcessing() {
  const { invoices, markInvoicePaid } = useData();
  const payable = useMemo(() => invoices.filter(i => i.status !== 'SUBMITTED'), [invoices]);
  const awaiting = useMemo(() => invoices.filter(i => i.status === 'MATCHED' || i.status === 'EXCEPTION'), [invoices]);
  const approved = useMemo(() => invoices.filter(i => i.status === 'APPROVED_FOR_PAYMENT'), [invoices]);
  const paid = useMemo(() => invoices.filter(i => i.status === 'PAID'), [invoices]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Accounts Payable Processing</h1>
        <p className="text-sm text-slate-500">Payment queue for matched and approved OEM invoices.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Awaiting Approval</p><p className="text-2xl font-bold text-amber-600 mt-1">{awaiting.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Approved for Payment</p><p className="text-2xl font-bold text-indigo-600 mt-1">{approved.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Paid</p><p className="text-2xl font-bold text-emerald-600 mt-1">{paid.length}</p></div>
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="a360-th">Invoice</th><th className="a360-th">Vendor</th><th className="a360-th">Amount</th><th className="a360-th">Due Date</th><th className="a360-th">Status</th><th className="a360-th"></th></tr></thead>
          <tbody>
            {payable.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                <td className="a360-td">{inv.vendor}</td>
                <td className="a360-td">${inv.amount.toLocaleString()}</td>
                <td className="a360-td text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="a360-td"><StatusBadge status={inv.status} /></td>
                <td className="a360-td text-right">
                  {inv.status === 'APPROVED_FOR_PAYMENT' && <button onClick={() => markInvoicePaid(inv.id)} className="a360-btn-primary !py-1 !px-2 text-xs">Mark Paid</button>}
                </td>
              </tr>
            ))}
            {!payable.length && <tr><td colSpan={6} className="a360-td text-center text-slate-400 py-8">No invoices in the AP queue.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
