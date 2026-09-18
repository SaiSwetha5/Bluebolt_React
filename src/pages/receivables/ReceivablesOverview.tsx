import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Finance-facing rollup across all customer subscriptions — mirrors the
// Invoices & Lease view on the payable side, for the receivable side.
export default function ReceivablesOverview() {
  const { receivableInvoices, receipts, sendDunningReminder } = useData();
  const [note, setNote] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const rows = useMemo(() => receivableInvoices.map(inv => {
    const daysOverdue = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / MS_PER_DAY);
    const isOverdue = inv.status !== 'PAID' && daysOverdue > 0;
    return { inv, daysOverdue, isOverdue };
  }), [receivableInvoices, today]);

  const outstanding = receivableInvoices.filter(i => i.status !== 'PAID');
  const overdueRows = rows.filter(r => r.isOverdue);
  const collected = receipts.reduce((s, r) => s + r.amount, 0);

  function remind(invoiceId: string) {
    sendDunningReminder(invoiceId);
    setNote(`Reminder logged for ${invoiceId}.`);
  }

  function remindAllOverdue() {
    overdueRows.forEach(r => sendDunningReminder(r.inv.id));
    setNote(overdueRows.length ? `Sent ${overdueRows.length} reminder(s) for overdue invoices.` : 'No overdue invoices to remind.');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Accounts Receivable</h1>
          <p className="text-sm text-slate-500">Customer invoices and receipts across all DaaS subscriptions.</p>
        </div>
        <button className="a360-btn-secondary" onClick={remindAllOverdue} disabled={!overdueRows.length}>
          Send Reminders to Overdue ({overdueRows.length})
        </button>
      </div>

      {note && (
        <div className="a360-card p-3 text-sm bg-amber-50/60 border-amber-100 text-amber-800 flex items-center justify-between">
          <span>{note}</span>
          <button className="text-xs text-amber-700 hover:underline" onClick={() => setNote(null)}>Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Outstanding Invoices</p><p className="text-2xl font-bold text-slate-800">{outstanding.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Overdue</p><p className="text-2xl font-bold text-rose-600">{overdueRows.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Total Collected</p><p className="text-2xl font-bold text-emerald-600">${collected.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-500">Total Invoices Issued</p><p className="text-2xl font-bold text-slate-800">{receivableInvoices.length}</p></div>
      </div>

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Invoice</th><th className="a360-th">Subscription</th><th className="a360-th">Customer</th>
            <th className="a360-th">Period</th><th className="a360-th">Amount</th><th className="a360-th">Due</th>
            <th className="a360-th">Status</th><th className="a360-th">Reminders</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {rows.map(({ inv, daysOverdue, isOverdue }) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                <td className="a360-td text-slate-500">{inv.subscriptionId}</td>
                <td className="a360-td">{inv.customerName}</td>
                <td className="a360-td">{inv.period}</td>
                <td className="a360-td">${inv.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td className="a360-td text-slate-500">
                  {inv.dueDate}{isOverdue && <span className="ml-1 text-rose-600 text-xs">({daysOverdue}d overdue)</span>}
                </td>
                <td className="a360-td"><StatusBadge status={isOverdue ? 'OVERDUE' : inv.status} /></td>
                <td className="a360-td text-slate-500">
                  {inv.reminderCount
                    ? <span>{inv.reminderCount}x · last {inv.lastReminderAt ? new Date(inv.lastReminderAt).toLocaleDateString() : '—'}</span>
                    : '—'}
                </td>
                <td className="a360-td text-right">
                  <div className="flex gap-1 justify-end">
                    {isOverdue && (
                      <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => remind(inv.id)}>Send Reminder</button>
                    )}
                    <Link to={`/receivables/subscriptions/${inv.subscriptionId}`} className="a360-btn-secondary !py-1 !px-2 text-xs">Open</Link>
                  </div>
                </td>
              </tr>
            ))}
            {!receivableInvoices.length && <tr><td colSpan={9} className="a360-td text-center text-slate-400 py-8">No invoices issued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
