import { useState } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { VendorName } from '../../types/models';

export default function InvoiceManagement() {
  const { invoices, goodsReceipts, vendorOrders, submitInvoice, approveInvoicePayment, createLeaseSchedule } = useData();
  const [showForm, setShowForm] = useState(false);
  const [grnId, setGrnId] = useState('');
  const [vendor, setVendor] = useState<VendorName | ''>('');
  const [amount, setAmount] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0,10));
  const [leaseInvoiceId, setLeaseInvoiceId] = useState<string | null>(null);
  const [leaseVendor, setLeaseVendor] = useState<VendorName>('HP');
  const [termMonths, setTermMonths] = useState(36);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10));

  function onGrnChange(id: string) {
    setGrnId(id);
    const g = goodsReceipts.find(x => x.id === id);
    const vo = g ? vendorOrders.find(v => v.id === g.vendorOrderId) : undefined;
    setVendor(vo?.vendor ?? '');
    if (vo) setAmount(vo.quantity * vo.unitCost);
  }

  function submit() {
    const g = goodsReceipts.find(x => x.id === grnId);
    const vo = g ? vendorOrders.find(v => v.id === g.vendorOrderId) : undefined;
    if (!g || !vo) return;
    const due = new Date(invoiceDate); due.setDate(due.getDate() + 30);
    submitInvoice({ vendor:vo.vendor, vendorOrderId:vo.id, grnId:g.id, poId:g.poId, amount:Number(amount), currency:'USD', invoiceDate, dueDate:due.toISOString().slice(0,10) });
    setShowForm(false); setGrnId('');
  }

  function openLease(invoiceId: string, v: VendorName) {
    setLeaseInvoiceId(invoiceId); setLeaseVendor(v);
    const inv = invoices.find(i => i.id === invoiceId);
    setMonthlyPayment(inv ? Math.round((inv.amount / termMonths) * 100) / 100 : 0);
  }

  function submitLease() {
    if (!leaseInvoiceId) return;
    const start = new Date(startDate); const end = new Date(start); end.setMonth(end.getMonth() + Number(termMonths));
    createLeaseSchedule({ vendor:leaseVendor, invoiceId:leaseInvoiceId, termMonths:Number(termMonths), monthlyPayment:Number(monthlyPayment), startDate, endDate:end.toISOString().slice(0,10) });
    setLeaseInvoiceId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Invoices &amp; Lease Schedules</h1>
          <p className="text-sm text-slate-500">OEM invoice submission, 3-way match validation, and lease schedule capture.</p>
        </div>
        <button className="a360-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ Submit Vendor Invoice'}</button>
      </div>

      {showForm && (
        <div className="a360-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Vendor Order (GRN'd)</label>
              <select className="a360-input" value={grnId} onChange={e => onGrnChange(e.target.value)} required>
                <option value="" disabled>Select a GRN...</option>
                {goodsReceipts.map(g => <option key={g.id} value={g.id}>{g.id} — {g.vendorOrderId} ({g.quantityReceived} units)</option>)}
              </select>
            </div>
            <div><label className="a360-label">Vendor</label><input className="a360-input" value={vendor} disabled /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="a360-label">Invoice Amount (USD)</label><input className="a360-input" type="number" min="0" value={amount} onChange={e => setAmount(Number(e.target.value))} required /></div>
            <div><label className="a360-label">Invoice Date</label><input className="a360-input" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="a360-btn-primary" onClick={submit}>Submit Invoice for 3-Way Match</button>
          </div>
        </div>
      )}

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Invoice</th><th className="a360-th">Vendor</th><th className="a360-th">PO</th><th className="a360-th">Amount</th>
            <th className="a360-th">3-Way Match</th><th className="a360-th">Status</th><th className="a360-th">Lease</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                <td className="a360-td">{inv.vendor}</td>
                <td className="a360-td">{inv.poId}</td>
                <td className="a360-td">${inv.amount.toLocaleString()}</td>
                <td className="a360-td text-xs">
                  <span className={inv.matchResult?.poMatch ? 'text-emerald-600' : 'text-rose-500'}>PO</span> ·{' '}
                  <span className={inv.matchResult?.podMatch ? 'text-emerald-600' : 'text-rose-500'}>POD</span> ·{' '}
                  <span className={inv.matchResult?.grnMatch ? 'text-emerald-600' : 'text-rose-500'}>GRN</span>
                </td>
                <td className="a360-td"><StatusBadge status={inv.status} /></td>
                <td className="a360-td text-slate-500">{inv.leaseScheduleId || '—'}</td>
                <td className="a360-td text-right">
                  {inv.status === 'MATCHED' && <button onClick={() => approveInvoicePayment(inv.id, 'Finance - R. Nair')} className="a360-btn-secondary !py-1 !px-2 text-xs">Approve Payment</button>}
                  {inv.status === 'APPROVED_FOR_PAYMENT' && !inv.leaseScheduleId && <button onClick={() => openLease(inv.id, inv.vendor)} className="a360-btn-secondary !py-1 !px-2 text-xs">Add Lease Schedule</button>}
                </td>
              </tr>
            ))}
            {!invoices.length && <tr><td colSpan={8} className="a360-td text-center text-slate-400 py-8">No invoices submitted yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {leaseInvoiceId && (
        <div className="a360-card p-5 space-y-4 border-brand-200">
          <h2 className="text-sm font-semibold text-slate-800">Lease Schedule for {leaseInvoiceId}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="a360-label">Term (months)</label><input className="a360-input" type="number" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} /></div>
            <div><label className="a360-label">Monthly Payment (USD)</label><input className="a360-input" type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(Number(e.target.value))} /></div>
            <div><label className="a360-label">Start Date</label><input className="a360-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="a360-btn-secondary" onClick={() => setLeaseInvoiceId(null)}>Cancel</button>
            <button className="a360-btn-primary" onClick={submitLease}>Create Lease Schedule</button>
          </div>
        </div>
      )}
    </div>
  );
}
