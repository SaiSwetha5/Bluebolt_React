import { useState, useMemo, useRef } from 'react';
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

  const calculatorRef = useRef<HTMLDivElement>(null);

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
      setResidualValue(round2(inv.amount * 0.15)); // Default estimate: 15% residual value
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
          <button
            className="a360-btn-primary"
            onClick={() => setShowInvoiceForm(s => !s)}
          >
            {showInvoiceForm ? 'Close' : '+ Submit Vendor Invoice'}
          </button>
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
                <th className="a360-th">Amount</th>
                <th className="a360-th">3-Way Match</th>
                <th className="a360-th">Status</th>
                <th className="a360-th">Lease</th>
                <th className="text-right a360-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  className={`hover:bg-slate-50 border-b border-slate-100 transition-colors ${
                    leaseInvoiceId === inv.id ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <td className="font-medium a360-td text-brand-700">{inv.id}</td>
                  <td className="a360-td">{inv.vendor}</td>
                  <td className="a360-td">{inv.poId}</td>
                  <td className="a360-td">${inv.amount.toLocaleString()}</td>
                  <td className="text-xs a360-td">
                    <span className={inv.matchResult?.poMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>PO</span> ·{' '}
                    <span className={inv.matchResult?.podMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>POD</span> ·{' '}
                    <span className={inv.matchResult?.grnMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}>GRN</span>
                  </td>
                  <td className="a360-td"><StatusBadge status={inv.status} /></td>
                  <td className="a360-td text-slate-500">{inv.leaseScheduleId || '—'}</td>
                  <td className="text-right a360-td">
                    {inv.status === 'MATCHED' && (
                      <button
                        onClick={() => approveInvoicePayment(inv.id, 'Finance - R. Nair')}
                        className="a360-btn-secondary !py-1 !px-2 text-xs"
                      >
                        Approve Payment
                      </button>
                    )}
                    {inv.status === 'APPROVED_FOR_PAYMENT' && !inv.leaseScheduleId && (
                      <button
                        onClick={() => openLeaseForInvoice(inv.id, inv.vendor)}
                        className="a360-btn-secondary !py-1 !px-2.5 text-xs text-brand-700 border-brand-300 hover:bg-brand-50"
                      >
                        {leaseInvoiceId === inv.id ? 'Editing Lease...' : 'Add Lease Schedule →'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center a360-td text-slate-400">
                    No invoices submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: OPERATING LEASE CALCULATOR & SCHEDULING (ONE VIEW) */}
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
              <p className="text-sm text-slate-500">
                LRF amortization engine — models the monthly payment for asset cost, rate, term, and residual value.
              </p>
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
            {/* Lease Details Panel */}
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

            {/* Lease Summary Panel */}
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

              <div className="p-3 mt-6 text-xs text-blue-700 border border-blue-100 rounded bg-blue-50/70">
                Calculated using monthly compounding amortization factoring the final balloon/residual recovery.
              </div>
            </div>
          </div>

          {/* Amortization Schedule Table */}
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
    </div>
  );
}