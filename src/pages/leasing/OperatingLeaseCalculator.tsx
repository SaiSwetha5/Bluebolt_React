import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateOperatingLease } from '../../utils/leaseCalculator';
import AmortizationTable from '../../components/ui/AmortizationTable';

// Standalone "LRF" operating-lease calculator — the same amortization engine
// used by DaaS Receivables (customer billing) and available on its own for
// finance to model a lease before attaching it to a subscription or a
// vendor lease schedule.
export default function OperatingLeaseCalculator() {
  const [assetCost, setAssetCost] = useState(2000);
  const [annualInterestRatePct, setAnnualInterestRatePct] = useState(7);
  const [termYears, setTermYears] = useState(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [residualValue, setResidualValue] = useState(300);

  const result = useMemo(
    () => calculateOperatingLease({ assetCost, annualInterestRatePct, termYears, startDate, residualValue }),
    [assetCost, annualInterestRatePct, termYears, startDate, residualValue]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Operating Lease Calculator</h1>
          <p className="text-sm text-slate-500">LRF amortization engine — models the monthly payment for any asset cost, rate, term and residual value.</p>
        </div>
        <Link to="/receivables/subscriptions/new" className="a360-btn-secondary text-sm">Use this to create a subscription →</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="a360-card p-5 space-y-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Lease details</h2>
          <div>
            <label className="a360-label">Asset cost</label>
            <input className="a360-input" type="number" min="0" step="0.01" value={assetCost} onChange={e => setAssetCost(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Annual interest rate (implicit)</label>
            <input className="a360-input" type="number" min="0" step="0.01" value={annualInterestRatePct} onChange={e => setAnnualInterestRatePct(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Lease term in years</label>
            <input className="a360-input" type="number" min="1" step="1" value={termYears} onChange={e => setTermYears(Number(e.target.value))} />
          </div>
          <div>
            <label className="a360-label">Start date of lease</label>
            <input className="a360-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="a360-label">Residual value</label>
            <input className="a360-input" type="number" min="0" step="0.01" value={residualValue} onChange={e => setResidualValue(Number(e.target.value))} />
          </div>
        </div>

        <div className="a360-card p-5 space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Lease summary</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Monthly lease payment</dt><dd className="font-semibold text-brand-700">${result.monthlyPayment.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Number of payments</dt><dd className="font-medium">{result.numberOfPayments}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Total interest</dt><dd className="font-medium">${result.totalInterest.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Total cost of lease</dt><dd className="font-medium">${result.totalCostOfLease.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><dt className="text-slate-500">Residual value</dt><dd className="font-medium">${result.residualValue.toLocaleString(undefined,{minimumFractionDigits:2})}</dd></div>
          </dl>
        </div>
      </div>

      <div className="a360-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-800">Amortization schedule</h2></div>
        <AmortizationTable rows={result.schedule} />
      </div>
    </div>
  );
}
