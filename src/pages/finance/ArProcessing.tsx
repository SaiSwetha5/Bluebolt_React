import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function ArProcessing() {
  const { receivableInvoices, receipts, customerSubscriptions, recordReceipt, sendDunningReminder } = useData();
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [method, setMethod] = useState<'ACH' | 'WIRE' | 'CARD' | 'CHECK'>('ACH');
  const [reference, setReference] = useState('');
  const [reminderNote, setReminderNote] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const rows = useMemo(() => receivableInvoices.map(inv => {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / MS_PER_DAY);
    const isOverdue = inv.status !== 'PAID' && daysOverdue > 0;
    const displayStatus = inv.status === 'PAID' ? 'PAID' : isOverdue ? 'OVERDUE' : inv.status;
    return { inv, daysOverdue, isOverdue, displayStatus };
  }).sort((a, b) => new Date(b.inv.issueDate).getTime() - new Date(a.inv.issueDate).getTime()), [receivableInvoices, today]);

  const outstanding = rows.filter(r => r.inv.status !== 'PAID');
  const overdue = outstanding.filter(r => r.isOverdue);
  const outstandingAmount = outstanding.reduce((s, r) => s + r.inv.amount, 0);
  const overdueAmount = overdue.reduce((s, r) => s + r.inv.amount, 0);
  const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);

  const aging = useMemo(() => {
    const buckets = { current: { count: 0, amount: 0 }, d1_30: { count: 0, amount: 0 }, d31_60: { count: 0, amount: 0 }, d60plus: { count: 0, amount: 0 } };
    for (const r of outstanding) {
      const bucket = r.daysOverdue <= 0 ? buckets.current : r.daysOverdue <= 30 ? buckets.d1_30 : r.daysOverdue <= 60 ? buckets.d31_60 : buckets.d60plus;
      bucket.count += 1; bucket.amount += r.inv.amount;
    }
    return buckets;
  }, [outstanding]);

  function submitReceipt(invoiceId: string) {
    if (!reference) return;
    recordReceipt(invoiceId, method, reference);
    setReceiptFor(null); setReference('');
  }

  function remind(invoiceId: string) {
    sendDunningReminder(invoiceId);
    setReminderNote(`Reminder logged for ${invoiceId}.`);
  }

  function remindAllOverdue() {
    const targets = overdue.map(r => r.inv.id);
    targets.forEach(id => sendDunningReminder(id));
    setReminderNote(targets.length ? `Sent ${targets.length} reminder(s) for overdue invoices.` : 'No overdue invoices to remind.');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Accounts Receivable</h1>
          <p className="text-sm text-slate-500">Customer invoice collections queue across all DaaS subscriptions.</p>
        </div>
        <button className="a360-btn-secondary" onClick={remindAllOverdue} disabled={!overdue.length}>
          Send Reminders to Overdue ({overdue.length})
        </button>
      </div>

      {reminderNote && (
        <div className="a360-card p-3 text-sm bg-amber-50/60 border-amber-100 text-amber-800 flex items-center justify-between">
          <span>{reminderNote}</span>
          <button className="text-xs text-amber-700 hover:underline" onClick={() => setReminderNote(null)}>Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="a360-card p-4">
          <p className="text-xs text-slate-400">Outstanding Invoices</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{outstanding.length}</p>
          <p className="text-xs text-slate-400 mt-1">${outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="a360-card p-4">
          <p className="text-xs text-slate-400">Overdue</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{overdue.length}</p>
          <p className="text-xs text-slate-400 mt-1">${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="a360-card p-4">
          <p className="text-xs text-slate-400">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 mt-1">{receipts.length} receipt(s)</p>
        </div>
        <div className="a360-card p-4">
          <p className="text-xs text-slate-400">Total Invoices Issued</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{receivableInvoices.length}</p>
          <p className="text-xs text-slate-400 mt-1">{customerSubscriptions.length} active subscription(s)</p>
        </div>
      </div>

      <div className="a360-card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Aging (outstanding balance)</p>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400">Current</p>
            <p className="text-lg font-bold text-slate-800">${aging.current.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">{aging.current.count} invoice(s)</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">1–30 days</p>
            <p className="text-lg font-bold text-amber-600">${aging.d1_30.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">{aging.d1_30.count} invoice(s)</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">31–60 days</p>
            <p className="text-lg font-bold text-orange-600">${aging.d31_60.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">{aging.d31_60.count} invoice(s)</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">60+ days</p>
            <p className="text-lg font-bold text-rose-600">${aging.d60plus.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-400">{aging.d60plus.count} invoice(s)</p>
          </div>
        </div>
      </div>

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Invoice</th><th className="a360-th">Customer</th><th className="a360-th">Subscription</th>
            <th className="a360-th">Period</th><th className="a360-th">Amount</th><th className="a360-th">Issue Date</th>
            <th className="a360-th">Due Date</th><th className="a360-th">Days Overdue</th><th className="a360-th">Status</th>
            <th className="a360-th">Receipt</th><th className="a360-th">Reminders</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {rows.map(({ inv, daysOverdue, isOverdue, displayStatus }) => {
              const receipt = receipts.find(r => r.id === inv.receiptId);
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                  <td className="a360-td">{inv.customerName}</td>
                  <td className="a360-td"><Link to={`/receivables/subscriptions/${inv.subscriptionId}`} className="text-slate-500 hover:text-brand-600">{inv.subscriptionId}</Link></td>
                  <td className="a360-td">{inv.period}</td>
                  <td className="a360-td">${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="a360-td text-slate-500">{inv.issueDate}</td>
                  <td className="a360-td text-slate-500">{inv.dueDate}</td>
                  <td className="a360-td text-slate-500">{inv.status !== 'PAID' && daysOverdue > 0 ? `${daysOverdue}d` : '—'}</td>
                  <td className="a360-td"><StatusBadge status={displayStatus} /></td>
                  <td className="a360-td text-slate-500">{receipt ? `${receipt.method} · ${receipt.reference}` : '—'}</td>
                  <td className="a360-td text-slate-500">
                    {inv.reminderCount
                      ? <span>{inv.reminderCount}x · last {inv.lastReminderAt ? new Date(inv.lastReminderAt).toLocaleDateString() : '—'}</span>
                      : '—'}
                  </td>
                  <td className="a360-td text-right">
                    <div className="flex gap-1 justify-end">
                      {isOverdue && receiptFor !== inv.id && (
                        <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => remind(inv.id)}>Send Reminder</button>
                      )}
                      {inv.status !== 'PAID' && receiptFor !== inv.id && (
                        <button className="a360-btn-primary !py-1 !px-2 text-xs" onClick={() => setReceiptFor(inv.id)}>Record Receipt</button>
                      )}
                      {receiptFor === inv.id && (
                        <div className="flex gap-1 justify-end">
                          <select className="a360-input !py-1 !w-24 text-xs" value={method} onChange={e => setMethod(e.target.value as any)}>
                            <option>ACH</option><option>WIRE</option><option>CARD</option><option>CHECK</option>
                          </select>
                          <input className="a360-input !py-1 !w-28 text-xs" placeholder="Reference" value={reference} onChange={e => setReference(e.target.value)} />
                          <button className="a360-btn-primary !py-1 !px-2 text-xs" onClick={() => submitReceipt(inv.id)}>Save</button>
                          <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => { setReceiptFor(null); setReference(''); }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={12} className="a360-td text-center text-slate-400 py-8">No receivable invoices issued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
