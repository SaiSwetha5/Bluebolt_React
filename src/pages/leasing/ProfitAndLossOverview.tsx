import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

// Helper formatting functions
function usd(n: number): string {
  return (
    '$' +
    (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function pct(n: number): string {
  if (!Number.isFinite(n) || isNaN(n)) return '0.0%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export default function ProfitAndLossOverview() {
  const {
    invoices,
    receivableInvoices,
    receipts,
    customerSubscriptions,
    assets,
    leaseSchedules,
  } = useData();

  // Filters
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'CONTRACT' | 'CASH_FLOW'>('CONTRACT');

  // All-invoices reconciliation filters
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'ALL' | 'VENDOR' | 'CUSTOMER'>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'PAID' | 'OUTSTANDING'>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TALLY PER SUBSCRIPTION / LEASE CONTRACT
  // ─────────────────────────────────────────────────────────────────────────────
  const contractTallies = useMemo(() => {
    const subs = (customerSubscriptions as any[]) ?? [];
    const invList = (invoices as any[]) ?? [];
    const arList = (receivableInvoices as any[]) ?? [];
    const recList = (receipts as any[]) ?? [];
    const assetList = (assets as any[]) ?? [];
    const leaseList = (leaseSchedules as any[]) ?? [];

    return subs.map((sub: any) => {
      // Linked asset & procurement origin
      const asset = assetList.find((a: any) => a.assetId === sub.assetId);
      const originInvoice = asset ? invList.find((i: any) => i.grnId === asset.grnId) : undefined;
      const vendorName = asset?.vendor || originInvoice?.vendor || 'Unknown Vendor';

      // Customer Side (Receivable / Inflow)
      const customerInvs = arList.filter((ar: any) => ar.subscriptionId === sub.id);
      const customerBilledTotal = customerInvs.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const customerPaidInvs = customerInvs.filter((r: any) => r.status === 'PAID');
      const customerCollectedCash = customerPaidInvs.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const customerPendingCash = Math.max(0, customerBilledTotal - customerCollectedCash);

      // Total Expected Subscription Value (Contract Life)
      const totalContractValue = (sub.monthlyPayment || 0) * (sub.termMonths || 0);

      // Vendor Side (Payable / Outflow)
      // Checks for direct lease link, GRN link, or asset purchase cost
      const vendorInvs = invList.filter(
        (i: any) =>
          (sub.leaseScheduleId && i.leaseScheduleId === sub.leaseScheduleId) ||
          (asset?.grnId && i.grnId === asset.grnId) ||
          i.poId === asset?.poId
      );

      const vendorCostRecorded =
        vendorInvs.length > 0
          ? vendorInvs.reduce((s: number, v: any) => s + (v.amount || 0), 0)
          : asset?.cost || sub.assetCost || 0;

      const vendorPaidTotal = vendorInvs
        .filter((i: any) => i.status === 'PAID')
        .reduce((s: number, i: any) => s + (i.amount || 0), 0);

      const vendorPendingPayment = Math.max(0, vendorCostRecorded - vendorPaidTotal);

      // P&L Metrics
      // Accrual Gross Profit = Contract Value - Procurement Cost
      const projectedGrossProfit = totalContractValue - vendorCostRecorded;
      const projectedMarginPct =
        totalContractValue > 0 ? (projectedGrossProfit / totalContractValue) * 100 : 0;

      // Realized Cash Balance = Actual Cash Inflow - Actual Cash Outflow
      const realizedNetCash = customerCollectedCash - vendorPaidTotal;

      return {
        subscriptionId: sub.id,
        customerName: sub.customerName || 'Customer',
        serviceClass: sub.serviceClass,
        assetId: sub.assetId,
        vendor: vendorName,
        poId: asset?.poId || originInvoice?.poId || '—',
        grnId: asset?.grnId || originInvoice?.grnId || '—',
        totalContractValue,
        customerBilledTotal,
        customerCollectedCash,
        customerPendingCash,
        vendorCostRecorded,
        vendorPaidTotal,
        vendorPendingPayment,
        projectedGrossProfit,
        projectedMarginPct,
        realizedNetCash,
        customerInvs,
        vendorInvs,
      };
    });
  }, [customerSubscriptions, invoices, receivableInvoices, receipts, assets, leaseSchedules]);

  // Unique vendors for filter
  const vendors = useMemo(() => {
    const list = Array.from(new Set(contractTallies.map(t => t.vendor).filter(Boolean)));
    return ['ALL', ...list];
  }, [contractTallies]);

  const filteredContracts = useMemo(() => {
    if (vendorFilter === 'ALL') return contractTallies;
    return contractTallies.filter(c => c.vendor === vendorFilter);
  }, [contractTallies, vendorFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. OVERALL AGGREGATE FINANCIAL ROLLUPS
  // ─────────────────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const totalCollectedFromCustomer = filteredContracts.reduce((s, c) => s + c.customerCollectedCash, 0);
    const totalPendingFromCustomer = filteredContracts.reduce((s, c) => s + c.customerPendingCash, 0);
    const totalBilledToCustomer = totalCollectedFromCustomer + totalPendingFromCustomer;

    const totalPaidToVendors = filteredContracts.reduce((s, c) => s + c.vendorPaidTotal, 0);
    const totalOwedToVendors = filteredContracts.reduce((s, c) => s + c.vendorPendingPayment, 0);
    const totalVendorCommitment = totalPaidToVendors + totalOwedToVendors;

    const netRealizedCash = totalCollectedFromCustomer - totalPaidToVendors;
    const netProjectedBalance = totalBilledToCustomer - totalVendorCommitment;

    const totalContractValue = filteredContracts.reduce((s, c) => s + c.totalContractValue, 0);
    const totalProjectedProfit = totalContractValue - totalVendorCommitment;
    const grossMarginPct = totalContractValue > 0 ? (totalProjectedProfit / totalContractValue) * 100 : 0;

    return {
      totalCollectedFromCustomer,
      totalPendingFromCustomer,
      totalBilledToCustomer,
      totalPaidToVendors,
      totalOwedToVendors,
      totalVendorCommitment,
      netRealizedCash,
      netProjectedBalance,
      totalContractValue,
    totalProjectedProfit,
      grossMarginPct,
      count: filteredContracts.length,
    };
  }, [filteredContracts]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FLAT ALL-INVOICES RECONCILIATION (every vendor payable + every customer
  //    receivable in one list — what's paid, what's still owed, and the
  //    per-invoice difference), independent of the contract grouping above.
  // ─────────────────────────────────────────────────────────────────────────────
  type FlatInvoiceRow = {
    key: string;
    kind: 'VENDOR' | 'CUSTOMER';
    invoiceId: string;
    counterparty: string;
    reference: string;
    date: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    pendingAmount: number;
    status: string;
    linkTo: string;
  };

  const flatInvoices = useMemo<FlatInvoiceRow[]>(() => {
    const invList = (invoices as any[]) ?? [];
    const arList = (receivableInvoices as any[]) ?? [];

    const vendorRows: FlatInvoiceRow[] = invList.map((inv: any) => {
      const isPaid = inv.status === 'PAID';
      const amount = inv.amount || 0;
      const paidAmount = isPaid ? amount : 0;
      return {
        key: `V-${inv.id}`,
        kind: 'VENDOR',
        invoiceId: inv.id,
        counterparty: inv.vendor || 'Unknown Vendor',
        reference: [inv.poId, inv.grnId].filter(Boolean).join(' · ') || '—',
        date: inv.invoiceDate,
        dueDate: inv.dueDate,
        amount,
        paidAmount,
        pendingAmount: Math.max(0, amount - paidAmount),
        status: inv.status,
        linkTo: `/finance/invoices?highlight=${inv.id}`,
      };
    });

    const customerRows: FlatInvoiceRow[] = arList.map((ar: any) => {
      const isPaid = ar.status === 'PAID';
      const amount = ar.amount || 0;
      const paidAmount = isPaid ? amount : 0;
      return {
        key: `C-${ar.id}`,
        kind: 'CUSTOMER',
        invoiceId: ar.id,
        counterparty: ar.customerName || 'Customer',
        reference: ar.subscriptionId || '—',
        date: ar.issueDate,
        dueDate: ar.dueDate,
        amount,
        paidAmount,
        pendingAmount: Math.max(0, amount - paidAmount),
        status: ar.status,
        linkTo: `/receivables/subscriptions/${ar.subscriptionId}`,
      };
    });

    return [...vendorRows, ...customerRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, receivableInvoices]);

  const filteredFlatInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return flatInvoices.filter(row => {
      if (invoiceTypeFilter !== 'ALL' && row.kind !== invoiceTypeFilter) return false;
      if (invoiceStatusFilter === 'PAID' && row.status !== 'PAID') return false;
      if (invoiceStatusFilter === 'OUTSTANDING' && row.status === 'PAID') return false;
      if (q) {
        const haystack = `${row.invoiceId} ${row.counterparty} ${row.reference}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [flatInvoices, invoiceTypeFilter, invoiceStatusFilter, invoiceSearch]);

  const flatTotals = useMemo(() => {
    const vendorRows = filteredFlatInvoices.filter(r => r.kind === 'VENDOR');
    const customerRows = filteredFlatInvoices.filter(r => r.kind === 'CUSTOMER');
    const vendorInvoiced = vendorRows.reduce((s, r) => s + r.amount, 0);
    const vendorPaid = vendorRows.reduce((s, r) => s + r.paidAmount, 0);
    const vendorPending = vendorRows.reduce((s, r) => s + r.pendingAmount, 0);
    const customerInvoiced = customerRows.reduce((s, r) => s + r.amount, 0);
    const customerPaid = customerRows.reduce((s, r) => s + r.paidAmount, 0);
    const customerPending = customerRows.reduce((s, r) => s + r.pendingAmount, 0);
    return {
      vendorCount: vendorRows.length,
      customerCount: customerRows.length,
      vendorInvoiced,
      vendorPaid,
      vendorPending,
      customerInvoiced,
      customerPaid,
      customerPending,
      netPaidDifference: customerPaid - vendorPaid,
      netPendingDifference: customerPending - vendorPending,
    };
  }, [filteredFlatInvoices]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Profit &amp; Loss</h1>
          <p className="text-sm text-slate-500">
            Tally payments made to OEM vendors against customer revenue to track margin, collected cash, and outstanding balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Vendor:</span>
            <select
              className="a360-input !py-1 !w-36 text-xs"
              value={vendorFilter}
              onChange={e => setVendorFilter(e.target.value)}
            >
              {vendors.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="a360-btn-secondary !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5"
            onClick={() => window.print()}
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H9v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Statement
          </button>
        </div>
      </div>

      {/* ── Executive KPI Tally Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Inflow */}
        <div className="a360-card p-4 border-l-4 border-emerald-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collected from Customers</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{usd(totals.totalCollectedFromCustomer)}</p>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
            <span>Pending AR:</span>
            <span className="font-medium text-amber-600">{usd(totals.totalPendingFromCustomer)}</span>
          </div>
        </div>

        {/* Realized Outflow */}
        <div className="a360-card p-4 border-l-4 border-rose-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid to OEM Vendors</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{usd(totals.totalPaidToVendors)}</p>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
            <span>Outstanding AP:</span>
            <span className="font-medium text-slate-700">{usd(totals.totalOwedToVendors)}</span>
          </div>
        </div>

        {/* Realized Net Cash In Hand */}
        <div
          className={`a360-card p-4 border-l-4 ${
            totals.netRealizedCash >= 0 ? 'border-brand-500' : 'border-amber-500'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Realized Net Cash Flow</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              totals.netRealizedCash >= 0 ? 'text-brand-700' : 'text-amber-600'
            }`}
          >
            {totals.netRealizedCash >= 0 ? '+' : ''}
            {usd(totals.netRealizedCash)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Cash Inflow minus Cash Paid Out</p>
        </div>

        {/* Overall Projected Gross Margin */}
        <div className="a360-card p-4 border-l-4 border-indigo-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Gross Profit</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-indigo-700">{usd(totals.totalProjectedProfit)}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {pct(totals.grossMarginPct)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Total Contract Rev − Total Cost</p>
        </div>
      </div>

      {/* ── Visual Comparison Card: Inflow vs Outflow ────────────────────────── */}
 

      {/* ── Master Tally Table ──────────────────────────────────────────────── */}
      <div className="a360-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Lease Contracts &amp; Asset Margin Tally</h2>
            <p className="text-xs text-slate-500">
              Contract-level reconciliation between customer billing and procurement acquisition costs.
            </p>
          </div>
          <span className="text-xs text-slate-400">{filteredContracts.length} contract(s) tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                <th className="a360-th">Subscription / Customer</th>
                <th className="a360-th">Asset &amp; PO</th>
                <th className="a360-th">Vendor</th>
                <th className="a360-th text-right">Vendor Cost (AP)</th>
                <th className="a360-th text-right">Paid to Vendor</th>
                <th className="a360-th text-right">Customer Revenue (AR)</th>
                <th className="a360-th text-right">Collected</th>
                <th className="a360-th text-right">Cash Balance</th>
                <th className="a360-th text-right">Gross Margin</th>
                <th className="a360-th text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.map(row => {
                const isExpanded = expandedRowId === row.subscriptionId;
                const isPositiveMargin = row.projectedGrossProfit >= 0;

                return (
                  <tr
                    key={row.subscriptionId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isExpanded ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    {/* Subscription & Customer */}
                    <td className="a360-td">
                      <Link
                        to={`/receivables/subscriptions/${row.subscriptionId}`}
                        className="font-semibold text-brand-700 hover:underline block"
                      >
                        {row.subscriptionId}
                      </Link>
                      <span className="text-slate-600">{row.customerName}</span>
                    </td>

                    {/* Asset & Procurement link */}
                    <td className="a360-td text-slate-500">
                      <div>
                        Asset: <span className="font-medium text-slate-700">{row.assetId}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">PO: {row.poId}</div>
                    </td>

                    {/* Vendor */}
                    <td className="a360-td font-medium text-slate-700">{row.vendor}</td>

                    {/* Vendor Cost */}
                    <td className="a360-td text-right text-slate-700 font-medium">
                      {usd(row.vendorCostRecorded)}
                    </td>

                    {/* Paid to Vendor */}
                    <td className="a360-td text-right text-rose-600 font-medium">
                      {usd(row.vendorPaidTotal)}
                      {row.vendorPendingPayment > 0 && (
                        <div className="text-[10px] text-slate-400">
                          ({usd(row.vendorPendingPayment)} due)
                        </div>
                      )}
                    </td>

                    {/* Customer Revenue (Expected / Billed) */}
                    <td className="a360-td text-right text-slate-700 font-medium">
                      {usd(row.totalContractValue)}
                    </td>

                    {/* Customer Cash Collected */}
                    <td className="a360-td text-right text-emerald-600 font-medium">
                      {usd(row.customerCollectedCash)}
                      {row.customerPendingCash > 0 && (
                        <div className="text-[10px] text-amber-600">
                          ({usd(row.customerPendingCash)} uncollected)
                        </div>
                      )}
                    </td>

                    {/* Realized Cash Balance */}
                    <td className="a360-td text-right font-bold">
                      <span
                        className={
                          row.realizedNetCash >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }
                      >
                        {row.realizedNetCash >= 0 ? '+' : ''}
                        {usd(row.realizedNetCash)}
                      </span>
                    </td>

                    {/* Margin */}
                    <td className="a360-td text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold ${
                          isPositiveMargin
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {usd(row.projectedGrossProfit)} ({pct(row.projectedMarginPct)})
                      </span>
                    </td>

                    {/* Drill down toggle */}
                    <td className="a360-td text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRowId(isExpanded ? null : row.subscriptionId)
                        }
                        className="a360-btn-secondary !py-1 !px-2 text-xs"
                      >
                        {isExpanded ? 'Close ▲' : 'Drilldown ▼'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredContracts.length && (
                <tr>
                  <td colSpan={10} className="a360-td py-8 text-center text-slate-400">
                    No matching ledger records found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Expandable Drill-Down Details Panel ──────────────────────────── */}
        {expandedRowId && (
          <div className="p-5 bg-slate-50 border-t border-slate-200">
            {(() => {
              const selected = filteredContracts.find(c => c.subscriptionId === expandedRowId);
              if (!selected) return null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      Detailed Traceability &amp; Invoices: {selected.subscriptionId} (
                      {selected.customerName})
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                      onClick={() => setExpandedRowId(null)}
                    >
                      Hide breakdown
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer AR Invoices breakdown */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                        Customer AR Billing Breakdown ({selected.customerInvs.length} invoices)
                      </p>
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-1">Inv #</th>
                              <th className="py-1">Period</th>
                              <th className="py-1">Amount</th>
                              <th className="py-1">Status</th>
                              <th className="py-1">Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selected.customerInvs.map((inv: any) => (
                              <tr key={inv.id}>
                                <td className="py-1.5 font-medium text-brand-700">{inv.id}</td>
                                <td className="py-1.5">{inv.period}</td>
                                <td className="py-1.5 font-medium">{usd(inv.amount)}</td>
                                <td className="py-1.5">
                                  <StatusBadge status={inv.status} />
                                </td>
                                <td className="py-1.5 text-slate-500">{inv.dueDate}</td>
                              </tr>
                            ))}
                            {!selected.customerInvs.length && (
                              <tr>
                                <td colSpan={5} className="py-3 text-center text-slate-400">
                                  No AR invoices generated yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Vendor AP Invoices breakdown */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2">
                        Vendor AP Invoices &amp; Costs ({selected.vendorInvs.length} records)
                      </p>
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-1">Inv #</th>
                              <th className="py-1">PO / GRN</th>
                              <th className="py-1">Amount</th>
                              <th className="py-1">Status</th>
                              <th className="py-1">Payment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selected.vendorInvs.map((inv: any) => (
                              <tr key={inv.id}>
                                <td className="py-1.5 font-medium text-brand-700">
                                  <Link
                                    to={`/finance/invoices?highlight=${inv.id}`}
                                    className="hover:underline"
                                  >
                                    {inv.id}
                                  </Link>
                                </td>
                                <td className="py-1.5 text-slate-500">
                                  {inv.poId || selected.poId} · {inv.grnId || selected.grnId}
                                </td>
                                <td className="py-1.5 font-medium">{usd(inv.amount)}</td>
                                <td className="py-1.5">
                                  <StatusBadge status={inv.status} />
                                </td>
                                <td className="py-1.5 text-slate-500">
                                  {inv.status === 'PAID'
                                    ? `${inv.paymentMethod || 'ACH'} · ${inv.paymentReference || 'Paid'}`
                                    : 'Pending'}
                                </td>
                              </tr>
                            ))}
                            {!selected.vendorInvs.length && (
                              <tr>
                                <td colSpan={5} className="py-3 text-center text-slate-400">
                                  Base Asset Acquisition Cost: {usd(selected.vendorCostRecorded)} (No direct AP line mapped)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── All-Invoices Reconciliation (flat, invoice-level) ─────────────── */}
      <div className="a360-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">All Invoices — Paid vs Pending Reconciliation</h2>
            <p className="text-xs text-slate-500">
              Every vendor payable and customer receivable in one list, with the paid / pending difference per invoice.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search invoice, vendor, customer, PO…"
              className="a360-input !py-1 !w-56 text-xs"
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
            />
            <select
              className="a360-input !py-1 !w-32 text-xs"
              value={invoiceTypeFilter}
              onChange={e => setInvoiceTypeFilter(e.target.value as any)}
            >
              <option value="ALL">All Types</option>
              <option value="VENDOR">Vendor (AP)</option>
              <option value="CUSTOMER">Customer (AR)</option>
            </select>
            <select
              className="a360-input !py-1 !w-32 text-xs"
              value={invoiceStatusFilter}
              onChange={e => setInvoiceStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid Only</option>
              <option value="OUTSTANDING">Outstanding Only</option>
            </select>
          </div>
        </div>

        {/* Reconciliation summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-white border-b border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Vendor Paid / Pending</p>
            <p className="font-bold text-slate-700 mt-0.5">
              <span className="text-rose-600">{usd(flatTotals.vendorPaid)}</span>
              {' / '}
              <span className="text-amber-600">{usd(flatTotals.vendorPending)}</span>
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Customer Paid / Pending</p>
            <p className="font-bold text-slate-700 mt-0.5">
              <span className="text-emerald-600">{usd(flatTotals.customerPaid)}</span>
              {' / '}
              <span className="text-amber-600">{usd(flatTotals.customerPending)}</span>
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Net Realized Difference</p>
            <p className={`font-bold mt-0.5 ${flatTotals.netPaidDifference >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {flatTotals.netPaidDifference >= 0 ? '+' : ''}{usd(flatTotals.netPaidDifference)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Net Pending Difference</p>
            <p className={`font-bold mt-0.5 ${flatTotals.netPendingDifference >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {flatTotals.netPendingDifference >= 0 ? '+' : ''}{usd(flatTotals.netPendingDifference)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600">
                <th className="a360-th">Invoice #</th>
                <th className="a360-th">Type</th>
                <th className="a360-th">Counterparty</th>
                <th className="a360-th">Reference</th>
                <th className="a360-th">Date</th>
                <th className="a360-th">Due</th>
                <th className="a360-th text-right">Amount</th>
                <th className="a360-th text-right">Paid</th>
                <th className="a360-th text-right">Pending (Diff)</th>
                <th className="a360-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFlatInvoices.map(row => (
                <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="a360-td">
                    <Link to={row.linkTo} className="font-semibold text-brand-700 hover:underline">
                      {row.invoiceId}
                    </Link>
                  </td>
                  <td className="a360-td">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.kind === 'VENDOR' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.kind === 'VENDOR' ? 'Vendor (AP)' : 'Customer (AR)'}
                    </span>
                  </td>
                  <td className="a360-td font-medium text-slate-700">{row.counterparty}</td>
                  <td className="a360-td text-slate-500">{row.reference}</td>
                  <td className="a360-td text-slate-500">{row.date || '—'}</td>
                  <td className="a360-td text-slate-500">{row.dueDate || '—'}</td>
                  <td className="a360-td text-right font-medium text-slate-700">{usd(row.amount)}</td>
                  <td className={`a360-td text-right font-medium ${row.kind === 'VENDOR' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {usd(row.paidAmount)}
                  </td>
                  <td className="a360-td text-right font-bold">
                    <span className={row.pendingAmount > 0 ? 'text-amber-600' : 'text-slate-400'}>
                      {usd(row.pendingAmount)}
                    </span>
                  </td>
                  <td className="a360-td">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {!filteredFlatInvoices.length && (
                <tr>
                  <td colSpan={10} className="a360-td py-8 text-center text-slate-400">
                    No invoices match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
            {!!filteredFlatInvoices.length && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-700">
                  <td className="a360-td" colSpan={6}>
                    Totals ({flatTotals.vendorCount} vendor · {flatTotals.customerCount} customer)
                  </td>
                  <td className="a360-td text-right">
                    {usd(flatTotals.vendorInvoiced + flatTotals.customerInvoiced)}
                  </td>
                  <td className="a360-td text-right text-emerald-700">
                    {usd(flatTotals.vendorPaid + flatTotals.customerPaid)}
                  </td>
                  <td className="a360-td text-right text-amber-600">
                    {usd(flatTotals.vendorPending + flatTotals.customerPending)}
                  </td>
                  <td className="a360-td"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}