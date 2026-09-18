import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SelectionMode = 'single' | 'multi';

export default function ApProcessing() {
  const { invoices, payInvoices, sendApDunningReminder } = useData();
  const payable = useMemo(() => invoices.filter(i => i.status !== 'SUBMITTED'), [invoices]);
  const awaiting = useMemo(() => invoices.filter(i => i.status === 'MATCHED' || i.status === 'EXCEPTION'), [invoices]);
  const approved = useMemo(() => invoices.filter(i => i.status === 'APPROVED_FOR_PAYMENT'), [invoices]);
  const paid = useMemo(() => invoices.filter(i => i.status === 'PAID'), [invoices]);

  const today = useMemo(() => new Date(), []);
  const overdue = useMemo(() => payable.filter(i => i.status !== 'PAID' && (new Date(i.dueDate).getTime() < today.getTime())), [payable, today]);

  // Row selection — toggle between selecting exactly one row (single) or
  // any number of rows (multi) for the "Mark Paid" bulk action.
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('multi');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const approvedIds = useMemo(() => approved.map(i => i.id), [approved]);
  const allSelected = approvedIds.length > 0 && approvedIds.every(id => selectedIds.includes(id));
  const selectedTotal = useMemo(
    () => invoices.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + i.amount, 0),
    [invoices, selectedIds]
  );

  function toggleOne(id: string) {
    if (selectionMode === 'single') {
      setSelectedIds(l => l.includes(id) ? [] : [id]);
    } else {
      setSelectedIds(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);
    }
  }
  function toggleAll() {
    if (selectionMode === 'single') return;
    setSelectedIds(allSelected ? [] : approvedIds);
  }
  function changeMode(mode: SelectionMode) {
    setSelectionMode(mode);
    setSelectedIds(l => mode === 'single' ? l.slice(0, 1) : l);
  }

  function autoReference(prefix: string) {
    return `${prefix}-${Date.now().toString().slice(-8)}`;
  }

  function markPaidSingle(id: string) {
    const result = payInvoices([id], 'ACH', autoReference('PAY'));
    if (result) setNote(`Marked ${id} as paid.`);
  }

  function markPaidSelected() {
    if (!selectedIds.length) return;
    const result = payInvoices(selectedIds, 'ACH', autoReference('PAY'));
    if (result) {
      setNote(`Marked ${result.invoiceIds.length} invoice(s) as paid — $${result.totalAmount.toLocaleString()} total. Any lease-linked invoice(s) will auto-generate their next billing period.`);
      setSelectedIds([]);
    }
  }

  function remind(id: string) {
    sendApDunningReminder(id);
    setNote(`Payment reminder logged for ${id}.`);
  }

  function remindAllOverdue() {
    overdue.forEach(i => sendApDunningReminder(i.id));
    setNote(overdue.length ? `Sent ${overdue.length} reminder(s) for overdue payables.` : 'No overdue payables to remind.');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Accounts Payable Processing</h1>
          <p className="text-sm text-slate-500">Payment queue for matched and approved OEM invoices. Every row traces back to the GRN it was matched against, and forward to its lease schedule.</p>
        </div>
        <button className="a360-btn-secondary" onClick={remindAllOverdue} disabled={!overdue.length}>
          Send Reminders to Overdue ({overdue.length})
        </button>
      </div>

      {note && (
        <div className="a360-card p-3 text-sm bg-amber-50/60 border-amber-100 text-amber-800 flex items-center justify-between">
          <span>{note}</span>
          <button className="text-xs text-amber-700 hover:underline" onClick={() => setNote(null)}>Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Awaiting Approval</p><p className="text-2xl font-bold text-amber-600 mt-1">{awaiting.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Approved for Payment</p><p className="text-2xl font-bold text-indigo-600 mt-1">{approved.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Overdue / Unpaid</p><p className="text-2xl font-bold text-rose-600 mt-1">{overdue.length}</p></div>
        <div className="a360-card p-4"><p className="text-xs text-slate-400">Paid</p><p className="text-2xl font-bold text-emerald-600 mt-1">{paid.length}</p></div>
      </div>

     

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
         
            <th className="a360-th">Invoice</th><th className="a360-th">Vendor</th><th className="a360-th">GRN</th>
            <th className="a360-th">Amount</th><th className="a360-th">Due Date</th><th className="a360-th">Lease</th>
            <th className="a360-th">Status</th><th className="a360-th">Reminders</th><th className="a360-th">Payment</th>
          </tr></thead>
          <tbody>
            {payable.map(inv => {
              const isOverdue = inv.status !== 'PAID' && new Date(inv.dueDate).getTime() < today.getTime();
              const daysOverdue = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / MS_PER_DAY);
              const displayStatus = inv.status === 'PAID' ? 'PAID' : isOverdue ? 'OVERDUE' : inv.status;
              return (
                <tr key={inv.id} className={`hover:bg-slate-50 ${selectedIds.includes(inv.id) ? 'bg-indigo-50/40' : ''}`}>
                 
                  <td className="a360-td font-medium text-brand-700">
                    <Link to={`/finance/invoices?highlight=${inv.id}`} className="hover:underline">{inv.id}</Link>
                    {inv.recurring && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-semibold" title="Auto-generated recurring invoice">
                        Recurring{inv.period ? ` · ${inv.period}/${inv.totalPeriods}` : ''}
                      </span>
                    )}
                  </td>
                  <td className="a360-td">{inv.vendor}</td>
                  <td className="a360-td">
                    {inv.grnId
                      ? <Link to={`/finance/grn?highlight=${inv.grnId}`} className="text-slate-600 hover:text-brand-700 hover:underline">{inv.grnId}</Link>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="a360-td">${inv.amount.toLocaleString()}</td>
                  <td className="a360-td text-slate-500">
                    {new Date(inv.dueDate).toLocaleDateString()}
                    {isOverdue && <span className="ml-1 text-rose-600 text-xs">({daysOverdue}d overdue)</span>}
                  </td>
                  <td className="a360-td">
                    {inv.leaseScheduleId
                      ? <Link to={`/finance/invoices?highlight=${inv.id}`} className="text-slate-600 hover:text-brand-700 hover:underline">{inv.leaseScheduleId}</Link>
                      : <span className="text-slate-400">Not scheduled</span>}
                  </td>
                  <td className="a360-td"><StatusBadge status={displayStatus} /></td>
                  <td className="a360-td text-slate-500">
                    {inv.reminderCount
                      ? <span>{inv.reminderCount}x · last {inv.lastReminderAt ? new Date(inv.lastReminderAt).toLocaleDateString() : '—'}</span>
                      : '—'}
                    {isOverdue && (
                      <button className="a360-btn-secondary !py-0.5 !px-1.5 text-xs ml-2" onClick={() => remind(inv.id)}>Remind</button>
                    )}
                  </td>
                  <td className="a360-td text-slate-500">
                    {inv.status === 'PAID'
                      ? `${inv.paymentMethod} · ${inv.paymentReference}`
                      : inv.status === 'APPROVED_FOR_PAYMENT'
                        ? <button className="a360-btn-primary !py-1 !px-2 text-xs" onClick={() => markPaidSingle(inv.id)}>Mark Paid</button>
                        : '—'}
                  </td>
                </tr>
              );
            })}
            {!payable.length && <tr><td colSpan={10} className="a360-td text-center text-slate-400 py-8">No invoices in the AP queue.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
