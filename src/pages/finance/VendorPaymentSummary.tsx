/**
 * VendorPaymentSummary.tsx
 *
 * Clear, card-based view showing:
 *   - Per lease schedule: what Cognizant owes the vendor (payments made / remaining)
 *   - Per lease schedule: how many customer bills have been collected vs expected
 *   - A progress bar for visual clarity on each lease
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';

// ── tiny helpers ────────────────────────────────────────────────────────────

function usd(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    MATCHED: 'bg-blue-100 text-blue-700',
    APPROVED_FOR_PAYMENT: 'bg-indigo-100 text-indigo-700',
    EXCEPTION: 'bg-rose-100 text-rose-700',
    SUBMITTED: 'bg-slate-100 text-slate-500',
    OVERDUE: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export default function VendorPaymentSummary() {
  const {
    invoices,
    leaseSchedules,
    receivableInvoices,
    receipts,
    customerSubscriptions,
  } = useData();

  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [expandedLeaseId, setExpandedLeaseId] = useState<string | null>(null);

  // ── Build lease-centric data model ───────────────────────────────────────

  const leaseGroups = useMemo(() => {
    const lsList = (leaseSchedules as any[]) ?? [];
    const invList = (invoices as any[]) ?? [];
    const arList  = (receivableInvoices as any[]) ?? [];
    const subList = (customerSubscriptions as any[]) ?? [];
    const recList = (receipts as any[]) ?? [];

    return lsList.map((ls: any) => {
      // Vendor invoices linked to this lease
      const vendorInvs = invList.filter((i: any) => i.leaseScheduleId === ls.id);
      // Use the root / first invoice for stable PO + GRN
      const rootInv = vendorInvs.find((i: any) => !i.recurring) ?? vendorInvs[0] ?? null;

      const totalLeaseValue = ls.termMonths * ls.monthlyPayment;
      const paidPeriods: number = ls.paidPeriods ?? vendorInvs.filter((i: any) => i.status === 'PAID').length;
      const remaining = Math.max(0, totalLeaseValue - paidPeriods * ls.monthlyPayment);
      const paidPct = totalLeaseValue > 0 ? (paidPeriods / ls.termMonths) * 100 : 0;

      // Customer AR invoices linked via subscription → this lease
      const arInvs = arList.filter((ar: any) => {
        const sub = subList.find((s: any) => s.id === ar.subscriptionId);
        return sub?.leaseScheduleId === ls.id;
      });
      const arPaid = arInvs.filter((ar: any) => ar.status === 'PAID');
      const arPaidAmt = arPaid.reduce((s: number, ar: any) => s + (ar.amount ?? 0), 0);
      const arTotalAmt = arInvs.reduce((s: number, ar: any) => s + (ar.amount ?? 0), 0);

      return {
        ls,
        rootInv,
        vendorInvs,
        totalLeaseValue,
        paidPeriods,
        remaining,
        paidPct,
        arInvs,
        arPaid,
        arPaidAmt,
        arTotalAmt,
        recList,
      };
    });
  }, [leaseSchedules, invoices, receivableInvoices, customerSubscriptions, receipts]);

  // ── Vendor filter options ────────────────────────────────────────────────

  const vendors = useMemo(() => {
    const set = new Set(leaseGroups.map(g => g.rootInv?.vendor ?? g.ls.vendor ?? '').filter(Boolean));
    return ['ALL', ...Array.from(set)] as string[];
  }, [leaseGroups]);

  const filtered = useMemo(() => {
    if (vendorFilter === 'ALL') return leaseGroups;
    return leaseGroups.filter(g => (g.rootInv?.vendor ?? g.ls.vendor) === vendorFilter);
  }, [leaseGroups, vendorFilter]);

  // ── KPI totals ───────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const totalOwed     = filtered.reduce((s, g) => s + g.remaining, 0);
    const totalPaid     = filtered.reduce((s, g) => s + g.paidPeriods * g.ls.monthlyPayment, 0);
    const totalCustomer = filtered.reduce((s, g) => s + g.arPaidAmt, 0);
    const net           = totalCustomer - totalOwed;
    return { totalOwed, totalPaid, totalCustomer, net, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Vendor Payment Summary</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Track what Cognizant owes each vendor per lease, and how much has been
            collected from customers for the same lease.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-slate-500">Vendor</span>
          <select
            className="a360-input !py-1 !w-32 text-xs"
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
          >
            {vendors.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Summary Strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="a360-card p-4 border-l-4 border-rose-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Still Owed to Vendors</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{usd(kpi.totalOwed)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{kpi.count} lease{kpi.count !== 1 ? 's' : ''}</p>
        </div>
        <div className="a360-card p-4 border-l-4 border-emerald-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Paid to Vendors</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{usd(kpi.totalPaid)}</p>
          <p className="mt-0.5 text-xs text-slate-400">across all leases</p>
        </div>
        <div className="a360-card p-4 border-l-4 border-indigo-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Collected from Customers</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{usd(kpi.totalCustomer)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{(receipts as any[]).length} receipt(s)</p>
        </div>
        <div className={`a360-card p-4 border-l-4 ${kpi.net >= 0 ? 'border-emerald-400' : 'border-amber-400'}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Net Position</p>
          <p className={`mt-1 text-2xl font-bold ${kpi.net >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {kpi.net >= 0 ? '+' : ''}{usd(kpi.net)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Collected − Owed</p>
        </div>
      </div>

      {/* ── Lease Cards ─────────────────────────────────────────────────── */}
      {!filtered.length && (
        <div className="a360-card p-10 text-center text-slate-400">No lease schedules found.</div>
      )}

      <div className="space-y-4">
        {filtered.map(({ ls, rootInv, vendorInvs, totalLeaseValue, paidPeriods, remaining, paidPct, arInvs, arPaid, arPaidAmt, arTotalAmt, recList }) => {
          const isExpanded = expandedLeaseId === ls.id;
          const vendor = rootInv?.vendor ?? ls.vendor ?? '—';
          const arPaidPct = arInvs.length > 0 ? (arPaid.length / arInvs.length) * 100 : 0;

          return (
            <div key={ls.id} className="a360-card overflow-hidden">

              {/* ── Card Header ─────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-base font-bold text-brand-700">{ls.id}</span>
                    <span className="ml-2 text-xs text-slate-400">· {vendor}</span>
                  </div>
                  {rootInv && (
                    <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                      <span>Invoice: <span className="font-medium text-slate-700">{rootInv.id}</span></span>
                      {rootInv.poId && <span>PO: <span className="font-medium text-slate-700">{rootInv.poId}</span></span>}
                      {rootInv.grnId && <span>GRN: <span className="font-medium text-slate-700">{rootInv.grnId}</span></span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setExpandedLeaseId(isExpanded ? null : ls.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-900"
                >
                  {isExpanded ? 'Hide details ▲' : 'View details ▼'}
                </button>
              </div>

              {/* ── Two-column summary ──────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

                {/* Left: Vendor payments (what Cognizant OWES) */}
                <div className="p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-600 flex items-center gap-1">
                    <span>💸</span> Payments to Vendor ({vendor})
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{usd(paidPeriods * ls.monthlyPayment)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">paid of {usd(totalLeaseValue)} total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-rose-600">{usd(remaining)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">still owed</p>
                    </div>
                  </div>
                  <ProgressBar pct={paidPct} color="bg-rose-400" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      <span className="font-semibold text-slate-700">{paidPeriods}</span> of{' '}
                      <span className="font-semibold text-slate-700">{ls.termMonths}</span> payments made
                    </span>
                    <span>{usd(ls.monthlyPayment)}/month</span>
                  </div>
                </div>

                {/* Right: Customer billing (what Cognizant has COLLECTED) */}
                <div className="p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 flex items-center gap-1">
                    <span>💰</span> Bills Received from Customers
                  </p>
                  {arInvs.length === 0 ? (
                    <p className="text-sm text-slate-400 pt-2">No customer subscriptions linked to this lease.</p>
                  ) : (
                    <>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-slate-800">{usd(arPaidAmt)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">collected of {usd(arTotalAmt)} billed</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-indigo-600">{arPaid.length}<span className="text-slate-400 font-normal text-sm">/{arInvs.length}</span></p>
                          <p className="text-xs text-slate-400 mt-0.5">bills paid</p>
                        </div>
                      </div>
                      <ProgressBar pct={arPaidPct} color="bg-indigo-400" />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          <span className="font-semibold text-slate-700">{arPaid.length}</span> paid ·{' '}
                          <span className="font-semibold text-amber-600">{arInvs.length - arPaid.length}</span> outstanding
                        </span>
                        <button
                          onClick={() => setExpandedLeaseId(isExpanded ? null : ls.id)}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          View bills →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Expandable Detail Section ───────────────────────────── */}
              {isExpanded && (
                <div className="border-t border-slate-100">

                  {/* Vendor Lease Payment Schedule */}
                  <div className="p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                      Vendor Invoice Payments — Lease Schedule
                    </h4>
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Invoice</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">PO</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">GRN</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Payment #</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Amount</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Due Date</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Payment Ref</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendorInvs.length === 0 && (
                            <tr><td colSpan={8} className="px-3 py-3 text-slate-400 text-center">No vendor invoices linked.</td></tr>
                          )}
                          {vendorInvs.map((vi: any, idx: number) => {
                            const stableInv = vendorInvs.find((x: any) => !x.recurring) ?? vendorInvs[0] ?? vi;
                            const pmtNo = vi.period ?? (idx + 1);
                            return (
                              <tr key={vi.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-brand-700">
                                  <Link to={`/finance/invoices?highlight=${stableInv.id}`} className="hover:underline">
                                    {stableInv.id}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 text-slate-500">{stableInv.poId ?? vi.poId ?? '—'}</td>
                                <td className="px-3 py-2 text-slate-500">{stableInv.grnId ?? vi.grnId ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                                    {pmtNo}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium">{usd(vi.amount)}</td>
                                <td className="px-3 py-2 text-slate-500">
                                  {vi.dueDate ? new Date(vi.dueDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-3 py-2"><StatusPill status={vi.status} /></td>
                                <td className="px-3 py-2 text-slate-500">
                                  {vi.status === 'PAID' ? `${vi.paymentMethod ?? 'ACH'} · ${vi.paymentReference ?? '—'}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Customer Bills */}
                  {arInvs.length > 0 && (
                    <div className="px-5 pb-5">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                        Customer Bills Received
                      </h4>
                      <div className="overflow-x-auto rounded border border-indigo-100">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-indigo-50 border-b border-indigo-100">
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">AR Invoice</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Customer</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Subscription</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Period</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Amount</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Due Date</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Status</th>
                              <th className="px-3 py-2 text-left font-semibold text-indigo-600">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-50">
                            {arInvs.map((ar: any) => {
                              const rec = recList.find((r: any) => r.id === ar.receiptId);
                              return (
                                <tr key={ar.id} className="hover:bg-white">
                                  <td className="px-3 py-2 font-medium text-brand-700">{ar.id}</td>
                                  <td className="px-3 py-2 text-slate-600">{ar.customerName ?? '—'}</td>
                                  <td className="px-3 py-2 text-slate-500">{ar.subscriptionId ?? '—'}</td>
                                  <td className="px-3 py-2 text-slate-500">{ar.period ?? '—'}</td>
                                  <td className="px-3 py-2 font-medium">{usd(ar.amount ?? 0)}</td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {ar.dueDate ? new Date(ar.dueDate).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-3 py-2"><StatusPill status={ar.status ?? 'PENDING'} /></td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {rec ? `${rec.method} · ${rec.reference}` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
