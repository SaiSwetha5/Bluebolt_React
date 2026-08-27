import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { LifecycleStatus } from '../../types/models';

const FILTERS: ('ALL' | LifecycleStatus)[] = ['ALL','IN_PROCUREMENT','IN_TRANSIT','IN_STOCK','DEPLOYED','IN_REPAIR','RETIRED'];

export default function AssetList() {
  const { assets } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<'ALL' | LifecycleStatus>('ALL');

  const filtered = useMemo(() => {
    let list = assets;
    if (active !== 'ALL') list = list.filter(a => a.lifecycleStatus === active);
    if (search) { const q = search.toLowerCase(); list = list.filter(a => a.assetId.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || (a.assignedUser ?? '').toLowerCase().includes(q)); }
    return list;
  }, [assets, active, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Inventory / CMDB</h1>
        <p className="text-sm text-slate-500">Configuration management database for all client devices under management.</p>
      </div>
      <div className="a360-card p-3 flex flex-wrap gap-3 items-center">
        <input className="a360-input max-w-xs" placeholder="Search asset ID, serial, or user..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActive(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${active===f?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {f==='ALL'?'All':f.replace(/_/g,' ')}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} assets</span>
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Asset ID</th><th className="a360-th">Serial</th><th className="a360-th">Vendor / Model</th>
            <th className="a360-th">Lease End</th><th className="a360-th">Cost</th><th className="a360-th">Assigned User</th>
            <th className="a360-th">Location</th><th className="a360-th">Lifecycle</th>
          </tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.assetId} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/inventory/${a.assetId}`)}>
                <td className="a360-td font-medium text-brand-700">{a.assetId}</td>
                <td className="a360-td text-slate-500">{a.serialNumber}</td>
                <td className="a360-td">{a.vendor} — {a.model}</td>
                <td className="a360-td text-slate-500">{a.leaseEndDate ? new Date(a.leaseEndDate).toLocaleDateString() : '—'}</td>
                <td className="a360-td">${a.cost.toLocaleString()}</td>
                <td className="a360-td">{a.assignedUser || '—'}</td>
                <td className="a360-td text-slate-500">{a.location}</td>
                <td className="a360-td"><StatusBadge status={a.lifecycleStatus} /></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="a360-td text-center text-slate-400 py-8">No assets match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
