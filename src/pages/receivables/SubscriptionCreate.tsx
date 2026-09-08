import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import { calculateOperatingLease } from '../../utils/leaseCalculator';
import AmortizationTable from '../../components/ui/AmortizationTable';
import type { ServiceClass } from '../../types/models';
import { SERVICE_CLASSES } from '../../types/models';

export default function SubscriptionCreate() {
  const { assets, customerAccounts, createCustomerSubscription } = useData();
  const navigate = useNavigate();

  const billableAssets = useMemo(() => assets.filter(a => a.lifecycleStatus === 'DEPLOYED' || a.lifecycleStatus === 'IN_STOCK'), [assets]);

  const [customerAccountId, setCustomerAccountId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [serviceClass, setServiceClass] = useState<ServiceClass>('DaaS Standard');
  const [annualInterestRatePct, setAnnualInterestRatePct] = useState(7);
  const [termYears, setTermYears] = useState(3);
  const [residualValue, setResidualValue] = useState(200);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingDay, setBillingDay] = useState(1);

  const asset = assets.find(a => a.assetId === assetId);
  const customer = customerAccounts.find(c => c.id === customerAccountId);
  const assetCost = asset?.cost ?? 0;

  const preview = useMemo(
    () => calculateOperatingLease({ assetCost, annualInterestRatePct, termYears, startDate, residualValue }),
    [assetCost, annualInterestRatePct, termYears, startDate, residualValue]
  );

  function submit() {
    if (!asset || !customer) return;
    const sub = createCustomerSubscription({
      customerAccountId: customer.id, customerName: customer.name, assetId: asset.assetId, catalogItemId: asset.catalogItemId,
      serviceClass, assetCost, annualInterestRatePct, termYears, residualValue, startDate, billingDay,
    });
    navigate(`/receivables/subscriptions/${sub.id}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">New Customer Subscription</h1>
        <p className="text-sm text-slate-500">Attach an in-service asset to a DaaS billing schedule computed by the operating lease calculator (LRF).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="a360-card p-5 space-y-4 lg:col-span-1">
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
          <div>
            <label className="a360-label">Service Class</label>
            <select className="a360-input" value={serviceClass} onChange={e => setServiceClass(e.target.value as ServiceClass)}>
              {SERVICE_CLASSES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
            </select>
          </div>
          <div>
            <label className="a360-label">Asset Cost</label>
            <input className="a360-input" value={assetCost ? `$${assetCost.toLocaleString()}` : '—'} disabled />
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
          <button className="a360-btn-primary w-full" disabled={!asset || !customer} onClick={submit}>Create Subscription</button>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="a360-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Billing Preview</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Monthly payment</dt><dd className="font-semibold text-brand-700">${preview.monthlyPayment.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Number of payments</dt><dd className="font-medium">{preview.numberOfPayments}</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Total interest</dt><dd className="font-medium">${preview.totalInterest.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
              <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Total cost of lease</dt><dd className="font-medium">${preview.totalCostOfLease.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
            </dl>
          </div>
          <div className="a360-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-800">Amortization schedule (first 6 payments)</h2></div>
            <AmortizationTable rows={preview.schedule} maxRows={6} />
          </div>
        </div>
      </div>
    </div>
  );
}
