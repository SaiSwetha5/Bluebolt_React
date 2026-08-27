import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

const TABS = ['ALL', 'PENDING', 'PARTIALLY_RECEIVED', 'COMPLETED'] as const;
type TabFilter = typeof TABS[number];

export default function VendorPoList() {
  const { vendorPurchaseOrders } = useData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabFilter>('ALL');
  const [search, setSearch] = useState('');

  const filtered = vendorPurchaseOrders
    .filter(p => tab === 'ALL' || p.status === tab)
    .filter(p => !search || p.poNumber.toLowerCase().includes(search.toLowerCase()) || p.vendorName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Purchase Orders</h1>
        <p className="text-slate-500 text-sm">Manage Vendor PO → GRN entry workflow</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}>
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO number or vendor…" className="a360-input max-w-xs" />
      </div>

      <div className="a360-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="a360-th">PO Number</th>
              <th className="a360-th">PO Date</th>
              <th className="a360-th">Vendor</th>
              <th className="a360-th">PO Value</th>
              <th className="a360-th">Currency</th>
              <th className="a360-th">Exchange Rate</th>
              <th className="a360-th">Status</th>
              <th className="a360-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="a360-td text-center text-slate-400 py-8">No vendor POs found.</td></tr>}
            {filtered.map(po => (
              <tr key={po.id} className="hover:bg-slate-50">
                <td className="a360-td font-mono text-sm font-semibold">{po.poNumber}</td>
                <td className="a360-td text-xs">{po.poDate}</td>
                <td className="a360-td">{po.vendorName}</td>
                <td className="a360-td font-semibold">{po.poValue.toLocaleString()}</td>
                <td className="a360-td text-xs">{po.poCurrency}</td>
                <td className="a360-td text-xs">{po.exchangeRate} ({po.localCurrency})</td>
                <td className="a360-td"><StatusBadge status={po.status} /></td>
                <td className="a360-td">
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/procurement/vendor-po/${po.id}/grn`)} className="text-xs text-brand-600 hover:underline font-medium">Enter GRN</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Line items preview */}
      {filtered.map(po => (
        <div key={`${po.id}-lines`} className="a360-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800">{po.poNumber}</span>
            <span className="text-slate-400 mx-2">·</span>
            <span className="text-sm text-slate-600">{po.vendorName}</span>
          </div>
          <table className="w-full">
            <thead><tr><th className="a360-th">Item</th><th className="a360-th">PO Qty</th><th className="a360-th">Rate ({po.poCurrency})</th><th className="a360-th">Line Total</th></tr></thead>
            <tbody>
              {po.lineItems.map(li => (
                <tr key={li.id}>
                  <td className="a360-td">{li.itemName}</td>
                  <td className="a360-td">{li.poQty.toLocaleString()}</td>
                  <td className="a360-td">{li.rate.toLocaleString()}</td>
                  <td className="a360-td font-semibold">{(li.poQty * li.rate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
