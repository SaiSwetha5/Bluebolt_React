import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

function usd(n: number): string {
  return (
    '$' +
    (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

type Kind = 'VENDOR' | 'CUSTOMER';

interface FlatInvoiceRow {
  key: string;
  kind: Kind;
  invoiceId: string;
  counterparty: string;
  amount: number;
  status: string;
  date: string;
  period?: number;
  dealId: string; // subscriptionId this invoice's deal belongs to (or '' if unresolved)
  paired: boolean; // true if the same deal has a counterpart invoice for this period
}

interface Deal {
  subscriptionId: string;
  customerName: string;
  vendor: string;
  assetId: string;
  poId: string;
  grnId: string;
  vendorInvoices: any[];
  customerInvoices: any[];
  vendorTotal: number;
  vendorPaid: number;
  vendorPending: number;
  customerTotal: number;
  customerPaid: number;
  customerPending: number;
  balancePaid: number; // customerPaid - vendorPaid
  balanceTotal: number; // customerTotal - vendorTotal (contract-level profit/loss)
}

export default function InvoiceProfitLoss() {
  const { invoices, receivableInvoices, customerSubscriptions, assets } = useData();
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // ── Resolve one "deal" per subscription: which vendor invoices funded the
  //    asset, and which customer invoices bill for it. ─────────────────────
  const deals = useMemo<Deal[]>(() => {
    const subs = (customerSubscriptions as any[]) ?? [];
    const invList = (invoices as any[]) ?? [];
    const arList = (receivableInvoices as any[]) ?? [];
    const assetList = (assets as any[]) ?? [];

    return subs.map((sub: any) => {
      const asset = assetList.find((a: any) => a.assetId === sub.assetId);
      const vendor = asset?.vendor || 'Unknown Vendor';

      const customerInvoices = arList.filter((ar: any) => ar.subscriptionId === sub.id);
      const vendorInvoices = invList.filter(
        (i: any) =>
          (sub.leaseScheduleId && i.leaseScheduleId === sub.leaseScheduleId) ||
          (asset?.grnId && i.grnId === asset.grnId) ||
          i.poId === asset?.poId
      );

      const vendorTotal = vendorInvoices.length
        ? vendorInvoices.reduce((s: number, i: any) => s + (i.amount || 0), 0)
        : asset?.cost || sub.assetCost || 0;
      const vendorPaid = vendorInvoices
        .filter((i: any) => i.status === 'PAID')
        .reduce((s: number, i: any) => s + (i.amount || 0), 0);

      const customerTotal = customerInvoices.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const customerPaid = customerInvoices
        .filter((r: any) => r.status === 'PAID')
        .reduce((s: number, r: any) => s + (r.amount || 0), 0);

      return {
        subscriptionId: sub.id,
        customerName: sub.customerName || 'Customer',
        vendor,
        assetId: sub.assetId || '—',
        poId: asset?.poId || '—',
        grnId: asset?.grnId || '—',
        vendorInvoices,
        customerInvoices,
        vendorTotal,
        vendorPaid,
        vendorPending: Math.max(0, vendorTotal - vendorPaid),
        customerTotal,
        customerPaid,
        customerPending: Math.max(0, customerTotal - customerPaid),
        balancePaid: customerPaid - vendorPaid,
        balanceTotal: customerTotal - vendorTotal,
      };
    });
  }, [customerSubscriptions, invoices, receivableInvoices, assets]);

  const dealBySubId = useMemo(() => {
    const map = new Map<string, Deal>();
    deals.forEach(d => map.set(d.subscriptionId, d));
    return map;
  }, [deals]);

  // ── Flat, single pick-list of every invoice (vendor + customer), each
  //    tagged with the deal it belongs to so we can pull its counterpart. ──
  const allInvoiceRows = useMemo<FlatInvoiceRow[]>(() => {
    const rows: FlatInvoiceRow[] = [];
    deals.forEach(d => {
      const vendorPeriods = new Set(d.vendorInvoices.map((v: any) => v.period).filter((p: any) => p != null));
      const customerPeriods = new Set(d.customerInvoices.map((c: any) => c.period).filter((p: any) => p != null));
      d.vendorInvoices.forEach((v: any) => {
        rows.push({
          key: `V-${v.id}`,
          kind: 'VENDOR',
          invoiceId: v.id,
          counterparty: d.vendor,
          amount: v.amount || 0,
          status: v.status,
          date: v.invoiceDate,
          period: v.period,
          dealId: d.subscriptionId,
          paired: v.period != null && customerPeriods.has(v.period),
        });
      });
      d.customerInvoices.forEach((c: any) => {
        rows.push({
          key: `C-${c.id}`,
          kind: 'CUSTOMER',
          invoiceId: c.id,
          counterparty: d.customerName,
          amount: c.amount || 0,
          status: c.status,
          date: c.issueDate,
          period: c.period,
          dealId: d.subscriptionId,
          paired: c.period != null && vendorPeriods.has(c.period),
        });
      });
    });
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [deals]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allInvoiceRows;
    return allInvoiceRows.filter(r =>
      `${r.invoiceId} ${r.counterparty}`.toLowerCase().includes(q)
    );
  }, [allInvoiceRows, search]);

  const selectedRow = useMemo(
    () => allInvoiceRows.find(r => r.key === selectedKey) || null,
    [allInvoiceRows, selectedKey]
  );
  const selectedDeal = selectedRow ? dealBySubId.get(selectedRow.dealId) || null : null;

  const pairedPeriods = useMemo(() => {
    if (!selectedDeal) return { vendorPairedWith: new Set<number>(), customerPairedWith: new Set<number>() };
    const vendorPeriods = new Set<number>(selectedDeal.vendorInvoices.map((v: any) => v.period).filter((p: any) => p != null));
    const customerPeriods = new Set<number>(selectedDeal.customerInvoices.map((c: any) => c.period).filter((p: any) => p != null));
    return { vendorPairedWith: customerPeriods, customerPairedWith: vendorPeriods };
  }, [selectedDeal]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Invoice Profit/Loss</h1>
        <p className="text-sm text-slate-500">
          Pick one invoice — see exactly what was paid to the vendor and what was received from the
          customer for that same deal, and the balance between them.
        </p>
      </div>

      {/* ── Step 1: Pick an invoice ───────────────────────────────────── */}
      <div className="a360-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800">1. Select an Invoice</h2>
          <input
            type="text"
            placeholder="Search by invoice # or name…"
            className="a360-input !py-1 !w-64 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600">
                <th className="a360-th">Invoice #</th>
                <th className="a360-th">Type</th>
                <th className="a360-th">Counterparty</th>
                <th className="a360-th text-center">Period</th>
                <th className="a360-th">Date</th>
                <th className="a360-th text-right">Amount</th>
                <th className="a360-th">Status</th>
                <th className="a360-th">Vendor ↔ Customer</th>
                <th className="a360-th text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => {
                const isSelected = row.key === selectedKey;
                return (
                  <tr
                    key={row.key}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                  >
                    <td className="a360-td font-semibold text-brand-700">{row.invoiceId}</td>
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
                    <td className="a360-td text-center text-slate-500">{row.period ?? '—'}</td>
                    <td className="a360-td text-slate-500">{row.date || '—'}</td>
                    <td className="a360-td text-right font-medium text-slate-700">{usd(row.amount)}</td>
                    <td className="a360-td">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="a360-td">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.paired ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}
                        title={
                          row.paired
                            ? `Period ${row.period} is billed on both sides of this deal.`
                            : 'No matching invoice yet on the other side for this period.'
                        }
                      >
                        {row.paired ? 'Paired ✓' : 'Awaiting pair'}
                      </span>
                    </td>
                    <td className="a360-td text-center">
                      <button
                        type="button"
                        className={isSelected ? 'a360-btn-primary !py-1 !px-2 text-xs' : 'a360-btn-secondary !py-1 !px-2 text-xs'}
                        onClick={() => setSelectedKey(row.key)}
                      >
                        {isSelected ? 'Selected ✓' : 'View Balance'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={9} className="a360-td py-8 text-center text-slate-400">
                    No invoices match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Step 2: Vendor vs Customer balance for the selected invoice ─── */}
      {!selectedRow && (
        <div className="a360-card p-8 text-center text-sm text-slate-400">
          Select an invoice above to see its vendor payment vs. customer payment balance.
        </div>
      )}

      {selectedRow && !selectedDeal && (
        <div className="a360-card p-8 text-center text-sm text-amber-600 bg-amber-50/60 border-amber-100">
          This invoice isn't linked to a customer subscription / asset yet, so no counterpart payment can be
          shown.
        </div>
      )}

      {selectedRow && selectedDeal && (
        <div className="space-y-4">
          <div className="a360-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm">
              <span className="text-slate-400">Deal:</span>{' '}
              <span className="font-semibold text-slate-800">{selectedDeal.subscriptionId}</span>
              <span className="text-slate-400"> · Asset </span>
              <span className="font-medium text-slate-700">{selectedDeal.assetId}</span>
              <span className="text-slate-400"> · PO </span>
              <span className="font-medium text-slate-700">{selectedDeal.poId}</span>
            </div>
            <Link
              to={`/receivables/subscriptions/${selectedDeal.subscriptionId}`}
              className="text-xs text-brand-700 hover:underline"
            >
              Open full subscription →
            </Link>
          </div>

          {/* Side-by-side vendor vs customer cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor payment card */}
            <div className="a360-card p-5 border-l-4 border-rose-500">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Paid to Vendor — {selectedDeal.vendor}
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{usd(selectedDeal.vendorPaid)}</p>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Total vendor cost:</span>
                <span className="font-medium text-slate-700">{usd(selectedDeal.vendorTotal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">Still owed to vendor:</span>
                <span className="font-medium text-amber-600">{usd(selectedDeal.vendorPending)}</span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                {selectedDeal.vendorInvoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                      inv.id === selectedRow.invoiceId ? 'bg-rose-50 font-semibold' : ''
                    }`}
                  >
                    <Link to={`/finance/invoices?highlight=${inv.id}`} className="text-brand-700 hover:underline">
                      {inv.id}
                    </Link>
                    {inv.period != null && (
                      <span
                        className={`text-[10px] font-bold ${
                          pairedPeriods.vendorPairedWith.has(inv.period) ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                        title={
                          pairedPeriods.vendorPairedWith.has(inv.period)
                            ? `Period ${inv.period} customer invoice also on file.`
                            : `Period ${inv.period} — no matching customer invoice yet.`
                        }
                      >
                        P{inv.period}{pairedPeriods.vendorPairedWith.has(inv.period) ? ' ✓' : ''}
                      </span>
                    )}
                    <span>{usd(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
                {!selectedDeal.vendorInvoices.length && (
                  <p className="text-xs text-slate-400">
                    No AP invoice on file — using base asset cost {usd(selectedDeal.vendorTotal)}.
                  </p>
                )}
              </div>
            </div>

            {/* Customer payment card */}
            <div className="a360-card p-5 border-l-4 border-emerald-500">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Received from Customer — {selectedDeal.customerName}
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{usd(selectedDeal.customerPaid)}</p>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Total billed:</span>
                <span className="font-medium text-slate-700">{usd(selectedDeal.customerTotal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">Still uncollected:</span>
                <span className="font-medium text-amber-600">{usd(selectedDeal.customerPending)}</span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                {selectedDeal.customerInvoices.map((inv: any) => (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                      inv.id === selectedRow.invoiceId ? 'bg-emerald-50 font-semibold' : ''
                    }`}
                  >
                    <Link to={`/receivables/subscriptions/${selectedDeal.subscriptionId}`} className="text-brand-700 hover:underline">
                      {inv.id}
                    </Link>
                    {inv.period != null && (
                      <span
                        className={`text-[10px] font-bold ${
                          pairedPeriods.customerPairedWith.has(inv.period) ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                        title={
                          pairedPeriods.customerPairedWith.has(inv.period)
                            ? `Period ${inv.period} vendor invoice also on file.`
                            : `Period ${inv.period} — no matching vendor invoice yet.`
                        }
                      >
                        P{inv.period}{pairedPeriods.customerPairedWith.has(inv.period) ? ' ✓' : ''}
                      </span>
                    )}
                    <span>{usd(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
                {!selectedDeal.customerInvoices.length && (
                  <p className="text-xs text-slate-400">No AR invoice billed to this customer yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Balance callout */}
          <div
            className={`a360-card p-6 text-center border-2 ${
              selectedDeal.balancePaid >= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cash Balance (Received from Customer − Paid to Vendor)
            </p>
            <p
              className={`text-3xl font-extrabold mt-1 ${
                selectedDeal.balancePaid >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {selectedDeal.balancePaid >= 0 ? '+' : ''}
              {usd(selectedDeal.balancePaid)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Full-contract Profit/Loss (Total Billed − Total Vendor Cost):{' '}
              <span
                className={`font-bold ${
                  selectedDeal.balanceTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {selectedDeal.balanceTotal >= 0 ? '+' : ''}
                {usd(selectedDeal.balanceTotal)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
