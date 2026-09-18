import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import { calculateOperatingLease } from '../../utils/leaseCalculator';
import AmortizationTable from '../../components/ui/AmortizationTable';
import type { ServiceClass } from '../../types/models';
import { SERVICE_CLASSES } from '../../types/models';

export default function SubscriptionCreate() {
  const { assets, invoices, customerAccounts, createCustomerSubscription } = useData();
  const navigate = useNavigate();

  const billableAssets = useMemo(() => assets.filter(a => a.lifecycleStatus === 'DEPLOYED' || a.lifecycleStatus === 'IN_STOCK'), [assets]);

  const [customerAccountId, setCustomerAccountId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [serviceClass, setServiceClass] = useState<ServiceClass>('DaaS Standard');
  const [assetCost, setAssetCost] = useState(0);
  const [annualInterestRatePct, setAnnualInterestRatePct] = useState(7);
  const [termYears, setTermYears] = useState(3);
  const [residualValue, setResidualValue] = useState(200);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingDay, setBillingDay] = useState(1);

  const asset = assets.find(a => a.assetId === assetId);
  const customer = customerAccounts.find(c => c.id === customerAccountId);
  const catalogCost = asset?.cost ?? 0; // the asset's recorded procurement cost — floor for billing

  // PO / GRN / vendor invoice aren't picked separately — they're already
  // fixed the moment an asset is chosen, since every asset was received
  // against exactly one PO/GRN, and every vendor invoice is tied to a GRN.
  // Letting someone pick these independently would just risk a mismatched
  // set, so they're derived and shown read-only instead.
  const originInvoice = asset ? invoices.find(i => i.grnId === asset.grnId) : undefined;

  // Default Asset Cost to the asset's recorded cost whenever the selection
  // changes, but leave it editable so a markup/margin can be applied.
  useEffect(() => { setAssetCost(catalogCost); }, [assetId, catalogCost]);

  const assetCostError = asset && assetCost < catalogCost
    ? `Asset cost can't be less than the asset's price of $${catalogCost.toLocaleString()}. Enter $${catalogCost.toLocaleString()} or more.`
    : null;

  const preview = useMemo(
    () => (asset && !assetCostError) ? calculateOperatingLease({ assetCost, annualInterestRatePct, termYears, startDate, residualValue }) : null,
    [asset, assetCostError, assetCost, annualInterestRatePct, termYears, startDate, residualValue]
  );

  function submit() {
    if (!asset || !customer || assetCostError) return;
    const sub = createCustomerSubscription({
      customerAccountId: customer.id, customerName: customer.name, assetId: asset.assetId, catalogItemId: asset.catalogItemId,
      serviceClass, assetCost, annualInterestRatePct, termYears, residualValue, startDate, billingDay,
    });
    navigate(`/receivables/subscriptions/${sub.id}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Create Lease</h1>
        <p className="text-sm text-slate-500">Attach an in-service asset to a DaaS billing schedule computed by the operating lease calculator (LRF).</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="p-5 space-y-4 a360-card lg:col-span-1">
          <div>
            <label className="a360-label">Customer Account</label>
            <select className="a360-input" value={customerAccountId} onChange={e => setCustomerAccountId(e.target.value)}>
              <option value="" disabled>Select customer...</option>
              {customerAccounts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="a360-label">Asset</label>
            <select className="a360-input" value={assetId} onChange={e => setAssetId(e.target.value)}>
              <option value="" disabled>Select asset...</option>
              {billableAssets.map(a => <option key={a.assetId} value={a.assetId}>{a.assetId} — {a.model} (${a.cost.toLocaleString()})</option>)}
            </select>
          </div>

          {/* Read-only — inherited from the selected asset, not picked here. */}
          {asset && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Procurement Origin</p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-slate-400">Vendor</dt><dd className="font-medium text-slate-700">{asset.vendor}</dd></div>
                <div><dt className="text-slate-400">PO</dt><dd className="font-medium text-slate-700">{asset.poId}</dd></div>
                <div><dt className="text-slate-400">GRN</dt><dd className="font-medium text-slate-700">{asset.grnId || '—'}</dd></div>
                <div><dt className="text-slate-400">Vendor Invoice</dt><dd className="font-medium text-slate-700">{originInvoice ? originInvoice.id : '—'}</dd></div>
              </dl>
            </div>
          )}

          <div>
            <label className="a360-label">Service Class</label>
            <select className="a360-input" value={serviceClass} onChange={e => setServiceClass(e.target.value as ServiceClass)}>
              {SERVICE_CLASSES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
            </select>
          </div>
          <div>
            <label className="a360-label">Asset Cost</label>
            <input
              className={`a360-input ${assetCostError ? '!border-rose-400 focus:!ring-rose-300' : ''}`}
              type="number"
              min={catalogCost || 0}
              step="0.01"
              value={assetCost}
              disabled={!asset}
              onChange={e => setAssetCost(Number(e.target.value))}
            />
            {asset && (
              assetCostError
                ? <p className="mt-1 text-xs text-rose-600">{assetCostError}</p>
                : <p className="mt-1 text-xs text-slate-400">Asset price: ${catalogCost.toLocaleString()}. Bill at this price or higher (for margin) — never lower.</p>
            )}
          </div>
          <div>
            <label className="a360-label">Annual Interest Rate (implicit)</label>
            <input className="a360-input" type="number" step="0.01" value={annualInterestRatePct} onChange={e => setAnnualInterestRatePct(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Term (years)</label>
            <input className="a360-input" type="number" min="1" value={termYears} onChange={e => setTermYears(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Residual Value</label>
            <input className="a360-input" type="number" min="0" step="0.01" value={residualValue} onChange={e => setResidualValue(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Start Date</label>
            <input className="a360-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="a360-label">Billing Day of Month</label>
            <input className="a360-input" type="number" min="1" max="28" value={billingDay} onChange={e => setBillingDay(Number(e.target.value))} />
          </div>
          <button className="w-full a360-btn-primary" disabled={!asset || !customer || !!assetCostError} onClick={submit}>Create Lease</button>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="p-5 a360-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Billing Preview</h2>
            {preview ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between pb-2 border-b border-slate-100"><dt className="text-slate-500">Monthly payment</dt><dd className="font-semibold text-brand-700">${preview.monthlyPayment.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
                <div className="flex justify-between pb-2 border-b border-slate-100"><dt className="text-slate-500">Number of payments</dt><dd className="font-medium">{preview.numberOfPayments}</dd></div>
                <div className="flex justify-between pb-2 border-b border-slate-100"><dt className="text-slate-500">Total interest</dt><dd className="font-medium">${preview.totalInterest.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
                <div className="flex justify-between pb-2 border-b border-slate-100"><dt className="text-slate-500">Total cost of lease</dt><dd className="font-medium">${preview.totalCostOfLease.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">Select an asset to preview the billing schedule.</p>
            )}
          </div>
          <div className="overflow-hidden a360-card">
            <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-800">Schedule for first 6 payments</h2></div>
            {preview ? (
              <AmortizationTable rows={preview.schedule} maxRows={6} />
            ) : (
              <p className="p-4 text-sm text-slate-400">No schedule yet — select an asset first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
