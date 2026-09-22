import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { VendorName } from '../../types/models';

// ==========================================
// 1. LEASE CALCULATION MATH & HELPERS
// ==========================================

export interface LeaseAmortizationRow {
  period: number;
  paymentDate: string; // ISO yyyy-mm-dd
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
}

export interface LeaseCalculationInput {
  assetCost: number;
  annualInterestRatePct: number;
  termYears: number;
  startDate: string; // ISO yyyy-mm-dd
  residualValue: number;
}

export interface LeaseCalculationResult extends LeaseCalculationInput {
  monthlyPayment: number;
  numberOfPayments: number;
  totalInterest: number;
  totalCostOfLease: number;
  schedule: LeaseAmortizationRow[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function fmtDMY(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

export function calculateOperatingLease(input: LeaseCalculationInput): LeaseCalculationResult {
  const { assetCost, annualInterestRatePct, termYears, startDate, residualValue } = input;
  const n = Math.max(Math.round(termYears * 12), 1);
  const r = annualInterestRatePct / 100 / 12;

  let payment: number;
  if (r === 0) {
    payment = (assetCost - residualValue) / n;
  } else {
    const vn = Math.pow(1 + r, -n);
    payment = ((assetCost - residualValue * vn) * r) / (1 - vn);
  }
  payment = round2(payment);

  const schedule: LeaseAmortizationRow[] = [];
  let beginningBalance = assetCost;
  for (let period = 1; period <= n; period++) {
    const interest = round2(beginningBalance * r);
    let principal = round2(payment - interest);
    let endingBalance = round2(beginningBalance - principal);

    if (period === n) {
      principal = round2(beginningBalance - residualValue);
      endingBalance = residualValue;
    }

    schedule.push({
      period,
      paymentDate: addMonthsIso(startDate, period),
      beginningBalance: round2(beginningBalance),
      payment: round2(principal + interest),
      principal,
      interest,
      endingBalance,
    });
    beginningBalance = endingBalance;
  }

  const totalInterest = round2(schedule.reduce((s, row) => s + row.interest, 0));
  const totalCostOfLease = round2(schedule.reduce((s, row) => s + row.payment, 0));

  return {
    ...input,
    monthlyPayment: payment,
    numberOfPayments: n,
    totalInterest,
    totalCostOfLease,
    schedule,
  };
}

// Client-side HTML/PDF generator
function downloadInvoicePdf(inv: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the invoice PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${inv.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 30px; font-size: 13px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .box h4 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
          .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .row span:first-child { color: #64748b; }
          .row span:last-child { font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
          td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
          .total { text-align: right; margin-top: 24px; font-size: 16px; font-weight: bold; color: #0f172a; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">INVOICE DOCUMENT</h1>
            <div class="subtitle">Cognizant Asset360 · Client Device Lifecycle Management</div>
          </div>
          <div><span class="badge">${inv.status || 'MATCHED'}</span></div>
        </div>
        <div class="grid">
          <div class="box">
            <h4>Invoice &amp; Vendor Information</h4>
            <div class="row"><span>Invoice ID:</span> <span>${inv.id}</span></div>
            <div class="row"><span>Vendor:</span> <span>${inv.vendor}</span></div>
            <div class="row"><span>Date:</span> <span>${inv.invoiceDate || new Date().toISOString().slice(0, 10)}</span></div>
            <div class="row"><span>Due Date:</span> <span>${inv.dueDate || '30 Days Net'}</span></div>
          </div>
          <div class="box">
            <h4>Procurement Match References</h4>
            <div class="row"><span>Purchase Order (PO):</span> <span>${inv.poId || '—'}</span></div>
            <div class="row"><span>Goods Receipt (GRN):</span> <span>${inv.grnId || '—'}</span></div>
            <div class="row"><span>Lease Schedule:</span> <span>${inv.leaseScheduleId || 'None assigned'}</span></div>
            <div class="row"><span>3-Way Match:</span> <span>PO · POD · GRN Validated</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Reference</th>
              <th style="text-align: right;">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Invoice Drawdown / Device Hardware Batch</td>
              <td>${inv.poId || inv.id}</td>
              <td style="text-align: right;">$${Number(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">Total Payable: $${Number(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ==========================================
// 2. MAIN INTEGRATED COMPONENT
// ==========================================

export default function InvoiceAndLeaseManagement() {
  const {
    invoices,
    goodsReceipts,
    vendorOrders,
    submitInvoice,
    approveInvoicePayment,
    createLeaseSchedule,
    receivableInvoices,
  } = useData();

  // Submission Form State
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [grnId, setGrnId] = useState('');
  const [vendor, setVendor] = useState<VendorName | ''>('');
  const [amount, setAmount] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

  // Integrated Lease Flow State
  const [leaseInvoiceId, setLeaseInvoiceId] = useState<string | null>(null);
  const [leaseVendor, setLeaseVendor] = useState<VendorName>('HP');
  const [assetCost, setAssetCost] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(7);
  const [termYears, setTermYears] = useState<number>(3);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [residualValue, setResidualValue] = useState<number>(0);

  // Payment Approval Popup State
  const [paymentApprovalInvoiceId, setPaymentApprovalInvoiceId] = useState<string | null>(null);
  const [approverEmail, setApproverEmail] = useState('a.subramanian@cognizant.com');
  const [approvalSubject, setApprovalSubject] = useState('');
  const [approvalBody, setApprovalBody] = useState('');

  const calculatorRef = useRef<HTMLDivElement>(null);

  // Deep-link support
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const highlightRowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (highlightId) highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId]);

  // Open payment approval popup
  function openPaymentApproval(invoiceId: string) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    setPaymentApprovalInvoiceId(invoiceId);
    setApprovalSubject(`[Action Required] Approve Payment for ${invoiceId}`);

    const body = `Dear Approver,

An invoice requires your approval before payment can be processed.

─── Invoice Summary ────────────────────────────────────────
Invoice ID      : ${inv.id}
Vendor          : ${inv.vendor}
PO              : ${inv.poId}
Invoice Amount  : $${inv.amount.toLocaleString()}
3-Way Match     : PO · POD · GRN
Current Status  : ${inv.status}

─── Payment Approval ───────────────────────────────────────
The invoice has successfully completed the 3-way match validation
against the Purchase Order, Proof of Delivery, and Goods Receipt.

Please log in to Asset360 and navigate to:
  Invoices & Lease Schedules → ${inv.id}
to review and approve the payment.

Upon approval, the invoice status will be updated to
Approved for Payment.

This email was generated automatically by Asset360.`;

    setApprovalBody(body);
  }

  // Send payment approval
  function sendPaymentApproval() {
    if (!paymentApprovalInvoiceId) return;

    if (!approverEmail.trim()) {
      alert('Please enter the approver email.');
      return;
    }

    approveInvoicePayment(paymentApprovalInvoiceId, approverEmail);
    setPaymentApprovalInvoiceId(null);
  }

  // GRN selection updates
  function onGrnChange(id: string) {
    setGrnId(id);
    const g = goodsReceipts.find(x => x.id === id);
    const vo = g ? vendorOrders.find(v => v.id === g.vendorOrderId) : undefined;
    setVendor(vo?.vendor ?? '');
    if (vo) setAmount(vo.quantity * vo.unitCost);
  }

  // Invoice creation
  function submit() {
    const g = goodsReceipts.find(x => x.id === grnId);
    const vo = g ? vendorOrders.find(v => v.id === g.vendorOrderId) : undefined;
    if (!g || !vo) return;
    const due = new Date(invoiceDate);
    due.setDate(due.getDate() + 30);
    submitInvoice({
      vendor: vo.vendor,
      vendorOrderId: vo.id,
      grnId: g.id,
      poId: g.poId,
      amount: Number(amount),
      currency: 'USD',
      invoiceDate,
      dueDate: due.toISOString().slice(0, 10),
    });
    setShowInvoiceForm(false);
    setGrnId('');
  }

  // Open & navigate to the integrated lease calculator for a specific invoice
  function openLeaseForInvoice(invoiceId: string, v: VendorName) {
    const inv = invoices.find(i => i.id === invoiceId);
    setLeaseInvoiceId(invoiceId);
    setLeaseVendor(v);

    if (inv) {
      setAssetCost(inv.amount);
      setResidualValue(round2(inv.amount * 0.15));
    }

    setTimeout(() => {
      calculatorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // Real-time lease computation
  const leaseResult = useMemo(() => {
    return calculateOperatingLease({
      assetCost: Number(assetCost) || 0,
      annualInterestRatePct: Number(interestRate) || 0,
      termYears: Number(termYears) || 1,
      startDate,
      residualValue: Number(residualValue) || 0,
    });
  }, [assetCost, interestRate, termYears, startDate, residualValue]);

  // Finalize and save the schedule back to the system
  function submitLease() {
    if (!leaseInvoiceId) return;
    const termMonths = leaseResult.numberOfPayments;
    const end = addMonthsIso(startDate, termMonths);

    createLeaseSchedule({
      vendor: leaseVendor,
      invoiceId: leaseInvoiceId,
      termMonths,
      monthlyPayment: leaseResult.monthlyPayment,
      startDate,
      endDate: end,
    });

    setLeaseInvoiceId(null);
  }

  const currentModalInvoice = invoices.find(i => i.id === paymentApprovalInvoiceId);

  return (
    <div className="pb-12 space-y-8">
      {/* SECTION 1: INVOICE MANAGEMENT */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Invoices &amp; Lease Schedules</h1>
            <p className="text-sm text-slate-500">
              OEM invoice submission, 3-way match validation, and integrated lease schedule creation.
            </p>
          </div>
        </div>

        {showInvoiceForm && (
          <div className="p-5 space-y-4 a360-card">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="a360-label">Vendor Order (GRN'd)</label>
                <select
                  className="a360-input"
                  value={grnId}
                  onChange={e => onGrnChange(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a GRN...</option>
                  {goodsReceipts.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.id} — {g.vendorOrderId} ({g.quantityReceived} units)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="a360-label">Vendor</label>
                <input className="a360-input" value={vendor} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="a360-label">Invoice Amount (USD)</label>
                <input
                  className="a360-input"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="a360-label">Invoice Date</label>
                <input
                  className="a360-input"
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button className="a360-btn-primary" onClick={submit}>
                Submit Invoice for 3-Way Match
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto a360-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="a360-th">Invoice</th>
                <th className="a360-th">Vendor</th>
                <th className="a360-th">PO</th>
                <th className="a360-th">GRN</th>
                <th className="a360-th">Amount</th>
                <th className="a360-th">3-Way Match</th>
                <th className="a360-th">Status</th>
                <th className="a360-th">Lease</th>
                <th className="a360-th">Customer Invoice(s)</th>
                <th className="text-right a360-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  ref={inv.id === highlightId ? highlightRowRef : undefined}
                  className={`hover:bg-slate-50 border-b border-slate-100 transition-colors ${
                    inv.id === highlightId ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : leaseInvoiceId === inv.id ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="font-medium a360-td text-brand-700">{inv.id}</td>
                  <td className="a360-td">{inv.vendor}</td>
                  <td className="a360-td">{inv.poId}</td>
                  <td className="a360-td">
                    {inv.grnId
                      ? <Link to={`/finance/grn?highlight=${inv.grnId}`} className="text-slate-600 hover:text-brand-700 hover:underline">{inv.grnId}</Link>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="a360-td">${inv.amount.toLocaleString()}</td>
                  <td className="text-xs a360-td">
                    <span className={inv.matchResult?.poMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>PO</span> ·{' '}
                    <span className={inv.matchResult?.podMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>POD</span> ·{' '}
                    <span className={inv.matchResult?.grnMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>GRN</span>
                  </td>
                  <td className="a360-td"><StatusBadge status={inv.status} /></td>
                  <td className="a360-td text-slate-500">{inv.leaseScheduleId || '—'}</td>
                  <td className="a360-td">
                    {(() => {
                      const mapped = receivableInvoices.filter(r => r.vendorInvoiceId === inv.id);
                      if (!mapped.length) return <span className="text-slate-400">—</span>;
                      return (
                        <div className="flex flex-col gap-0.5">
                          {mapped.map(r => (
                            <Link
                              key={r.id}
                              to={`/receivables/subscriptions/${r.subscriptionId}`}
                              className="text-brand-600 hover:underline text-xs"
                              title={`Customer invoice billed against this vendor invoice (period ${r.period})`}
                            >
                              {r.id}
                            </Link>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="text-right a360-td">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* PDF Quick Download Icon Button */}
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(inv)}
                        title="Download Invoice PDF"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>

                      {/* Approve Payment Button */}
                      {inv.status === 'MATCHED' && (
                        <button
                          onClick={() => openPaymentApproval(inv.id)}
                          className="a360-btn-secondary !py-1 !px-2 text-xs hover:border-indigo-500 hover:text-indigo-600"
                        >
                          Approve Payment
                        </button>
                      )}

                      {/* Schedule Lease Button: Available for unassigned leases */}
                      {!inv.leaseScheduleId && (
                        <button
                          onClick={() => openLeaseForInvoice(inv.id, inv.vendor)}
                          className="a360-btn-secondary !py-1 !px-2.5 text-xs text-brand-700 border-brand-300 hover:bg-brand-50 whitespace-nowrap"
                        >
                          {leaseInvoiceId === inv.id ? 'Editing Lease...' : 'Add Lease Schedule →'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td colSpan={10} className="py-8 text-center a360-td text-slate-400">
                    No invoices submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: OPERATING LEASE CALCULATOR & SCHEDULING */}
      {leaseInvoiceId && (
        <section ref={calculatorRef} className="pt-4 space-y-6 border-t-2 border-dashed border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800">
                  Target: {leaseInvoiceId}
                </span>
                <span className="text-xs text-slate-400">Vendor: {leaseVendor}</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Operating Lease Calculator</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="a360-btn-secondary"
                onClick={() => setLeaseInvoiceId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-indigo-600 a360-btn-primary hover:bg-indigo-700"
                onClick={submitLease}
              >
                Save &amp; Confirm Lease Schedule
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="p-5 space-y-4 a360-card">
              <h3 className="pb-2 text-sm font-semibold border-b text-slate-800 border-slate-100">
                Lease Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs a360-label">Asset Cost (USD)</label>
                  <input
                    className="a360-input"
                    type="number"
                    value={assetCost}
                    onChange={e => setAssetCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs a360-label">Annual Interest Rate (Implicit %)</label>
                  <input
                    className="a360-input"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={e => setInterestRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs a360-label">Lease Term (Years)</label>
                  <input
                    className="a360-input"
                    type="number"
                    step="0.5"
                    value={termYears}
                    onChange={e => setTermYears(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs a360-label">Start Date of Lease</label>
                  <input
                    className="a360-input"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs a360-label">Residual Value (USD)</label>
                  <input
                    className="a360-input"
                    type="number"
                    value={residualValue}
                    onChange={e => setResidualValue(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-5 a360-card">
              <div>
                <h3 className="pb-2 text-sm font-semibold border-b text-slate-800 border-slate-100">
                  Lease Summary
                </h3>
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div>
                    <span className="text-xs text-slate-500">Monthly Lease Payment</span>
                    <p className="text-2xl font-bold text-brand-600">
                      ${leaseResult.monthlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Number of Payments</span>
                    <p className="text-2xl font-bold text-slate-800">
                      {leaseResult.numberOfPayments}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Total Interest</span>
                    <p className="text-lg font-semibold text-slate-700">
                      ${leaseResult.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Total Cost of Lease</span>
                    <p className="text-lg font-semibold text-slate-700">
                      ${leaseResult.totalCostOfLease.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Residual Value</span>
                    <p className="text-lg font-semibold text-slate-700">
                      ${leaseResult.residualValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden a360-card">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">Amortization Schedule</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b border-slate-200">
                  <tr>
                    <th className="a360-th">Pmt No.</th>
                    <th className="a360-th">Payment Date</th>
                    <th className="a360-th">Beginning Balance</th>
                    <th className="a360-th">Payment</th>
                    <th className="a360-th">Principal</th>
                    <th className="a360-th">Interest</th>
                    <th className="a360-th">Ending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaseResult.schedule.map(row => (
                    <tr key={row.period} className="text-xs hover:bg-slate-50">
                      <td className="font-medium a360-td text-slate-700">{row.period}</td>
                      <td className="a360-td text-slate-500">{fmtDMY(row.paymentDate)}</td>
                      <td className="a360-td">${row.beginningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="font-semibold a360-td text-brand-600">${row.payment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="a360-td text-slate-600">${row.principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="a360-td text-slate-600">${row.interest.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="font-medium a360-td text-slate-700">${row.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* PAYMENT APPROVAL POPUP */}
      {paymentApprovalInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
            <div className="p-5 border-b border-slate-200">
              <p className="mb-2 text-xs font-bold tracking-wider uppercase text-slate-400">
                Payment Approval Workflow
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Send {paymentApprovalInvoiceId} for payment approval
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                The payment approval request is emailed to the nominated approver. A notification copy is automatically routed to the procurement mailbox and recorded in the audit trail.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="a360-label">TO (APPROVER)</label>
                <input
                  type="email"
                  className="a360-input"
                  value={approverEmail}
                  onChange={e => setApproverEmail(e.target.value)}
                  placeholder="Enter approver email"
                  required
                />
              </div>

              <div>
                <label className="a360-label">SUBJECT</label>
                <input
                  type="text"
                  className="a360-input bg-slate-50 text-slate-600"
                  value={approvalSubject}
                  readOnly
                />
              </div>

              <div>
                <label className="a360-label">BODY</label>
                <textarea
                  className="a360-input h-56 font-mono text-[11px] leading-5 resize-none overflow-y-auto"
                  value={approvalBody}
                  onChange={e => setApprovalBody(e.target.value)}
                  readOnly
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                onClick={() => currentModalInvoice && downloadInvoicePdf(currentModalInvoice)}
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Invoice PDF</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="a360-btn-secondary"
                  onClick={() => setPaymentApprovalInvoiceId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="a360-btn-primary"
                  onClick={sendPaymentApproval}
                >
                  Send for approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}