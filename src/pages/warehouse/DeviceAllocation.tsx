import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DeviceAllocation() {
  const { assets, assignAsset } = useData();
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignUser, setAssignUser] = useState('');
  const [assignLocation, setAssignLocation] = useState('Client Office');

  const inStock = useMemo(() =>
    assets.filter(a => a.lifecycleStatus === 'IN_STOCK' && (!search || a.assetId.toLowerCase().includes(search.toLowerCase()) || a.serialNumber.toLowerCase().includes(search.toLowerCase()))),
    [assets, search]);

  function startAssign(id: string) { setAssigningId(id); setAssignUser(''); setAssignLocation('Client Office'); }
  function confirmAssign(id: string) { if (!assignUser) return; assignAsset(id, assignUser, assignLocation); setAssigningId(null); }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Device Allocation &amp; Dispatch</h1>
        <p className="text-sm text-slate-500">Allocate in-stock warehouse devices to end users and mark dispatch.</p>
      </div>
      <div className="a360-card p-3 flex gap-2 items-center">
        <input className="a360-input max-w-xs" placeholder="Search by asset ID or serial..." value={search} onChange={e => setSearch(e.target.value)} />
        <span className="text-xs text-slate-400">{inStock.length} devices in stock</span>
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="a360-th">Asset ID</th><th className="a360-th">Serial</th><th className="a360-th">Model</th><th className="a360-th">Location</th><th className="a360-th">Lifecycle</th><th className="a360-th">Assign</th></tr></thead>
          <tbody>
            {inStock.map(a => (
              <tr key={a.assetId} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{a.assetId}</td>
                <td className="a360-td text-slate-500">{a.serialNumber}</td>
                <td className="a360-td">{a.model}</td>
                <td className="a360-td">{a.location}</td>
                <td className="a360-td"><StatusBadge status={a.lifecycleStatus} /></td>
                <td className="a360-td">
                  {assigningId === a.assetId ? (
                    <div className="flex gap-2">
                      <input className="a360-input !py-1 !w-32" placeholder="User / dept" value={assignUser} onChange={e => setAssignUser(e.target.value)} />
                      <input className="a360-input !py-1 !w-32" placeholder="Location" value={assignLocation} onChange={e => setAssignLocation(e.target.value)} />
                      <button className="a360-btn-primary !py-1 !px-2 text-xs" onClick={() => confirmAssign(a.assetId)}>Dispatch</button>
                    </div>
                  ) : (
                    <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => startAssign(a.assetId)}>Allocate</button>
                  )}
                </td>
              </tr>
            ))}
            {!inStock.length && <tr><td colSpan={6} className="a360-td text-center text-slate-400 py-8">No devices currently in stock.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
