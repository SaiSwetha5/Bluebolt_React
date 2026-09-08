import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import AmortizationTable from '../../components/ui/AmortizationTable';
import AuditLogPanel from '../../components/ui/AuditLogPanel';
import { calculateOperatingLease } from '../../utils/leaseCalculator';

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const { customerSubscriptions, receivableInvoices, receipts, generateReceivableInvoice, recordReceipt, auditFor } = useData();
  const sub = customerSubscriptions.find(s => s.id === id);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [method, setMethod] = useState<'ACH' | 'WIRE' | 'CARD' | 'CHECK'>('ACH');
  const [reference, setReference] = useState('');

  const schedule = useMemo(() => sub ? calculateOperatingLease({
    assetCost: sub.assetCost, annualInterestRatePct: sub.annualInterestRatePct,
    termYears: sub.termMonths / 12, startDate: sub.startDate, residualValue: sub.residualValue,
  }).schedule : [], [sub]);

  if (!sub) return <div className="text-center text-slate-400 py-16">Subscription not found.</div>;

  const invoices = receivableInvoices.filter(i => i.subscriptionId === sub.id).sort((a, b) => a.period - b.period);
  const audit = auditFor(sub.id);
  const canBill = sub.nextInvoicePeriod <= sub.termMonths;

  function submitReceipt(invoiceId: string) {
    if (!reference) return;
    recordReceipt(invoiceId, method, reference);
    setReceiptFor(null); setReference('');
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/receivables/subscriptions" className="text-sm text-slate-500 hover:text-brand-600">← Back to Subscriptions</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-lg font-bold text-slate-800">{sub.id}</h1>
          <StatusBadge status={sub.status} />
        </div>
        <p className="text-sm text-slate-500">{sub.customerName} · Asset {sub.assetId} · {sub.serviceClass}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="a360-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">Billing</h2>
              <button className="a360-btn-primary !py-1 !px-3 text-xs" disabled={!canBill} onClick={() => generateReceivableInvoice(sub.id)}>
                {canBill ? `Generate Invoice (period ${sub.nextInvoicePeriod}/${sub.termMonths})` : 'All periods invoiced'}
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Monthly payment</dt><dd className="font-semibold text-brand-700">${sub.monthlyPayment.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Term</dt><dd className="font-medium">{sub.termMonths} months</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Start / End</dt><dd className="font-medium">{sub.startDate} → {sub.endDate}</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Residual value</dt><dd className="font-medium">${sub.residualValue.toLocaleString()}</dd></div>
            </dl>
          </div>

          <div className="a360-card overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-800">Invoices &amp; Receipts</h2></div>
            <table className="w-full">
              <thead><tr>
                <th className="a360-th">Invoice</th><th className="a360-th">Period</th><th className="a360-th">Amount</th>
                <th className="a360-th">Due</th><th className="a360-th">Status</th><th className="a360-th">Receipt</th><th className="a360-th"></th>
              </tr></thead>
              <tbody>
                {invoices.map(inv => {
                  const receipt = receipts.find(r => r.id === inv.receiptId);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="a360-td font-medium text-brand-700">{inv.id}</td>
                      <td className="a360-td">{inv.period}/{sub.termMonths}</td>
                      <td className="a360-td">${inv.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td className="a360-td text-slate-500">{inv.dueDate}</td>
                      <td className="a360-td"><StatusBadge status={inv.status} /></td>
                      <td className="a360-td text-slate-500">{receipt ? `${receipt.method} · ${receipt.reference}` : '—'}</td>
                      <td className="a360-td text-right">
                        {inv.status !== 'PAID' && receiptFor !== inv.id && (
                          <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => setReceiptFor(inv.id)}>Record Receipt</button>
                        )}
                        {receiptFor === inv.id && (
                          <div className="flex gap-1 justify-end">
                            <select className="a360-input !py-1 !w-24 text-xs" value={method} onChange={e => setMethod(e.target.value as any)}>
                              <option>ACH</option><option>WIRE</option><option>CARD</option><option>CHECK</option>
                            </select>
                            <input className="a360-input !py-1 !w-28 text-xs" placeholder="Reference" value={reference} onChange={e => setReference(e.target.value)} />
                            <button className="a360-btn-primary !py-1 !px-2 text-xs" onClick={() => submitReceipt(inv.id)}>Save</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!invoices.length && <tr><td colSpan={7} className="a360-td text-center text-slate-400 py-8">No invoices generated yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="a360-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-800">Full amortization schedule</h2></div>
            <AmortizationTable rows={schedule} />
          </div>
        </div>
        <div><AuditLogPanel entries={audit} /></div>
      </div>
    </div>
  );
}
