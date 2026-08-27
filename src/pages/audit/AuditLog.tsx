import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import type { AuditLogEntry } from '../../types/models';

function fmt(ts: string) { return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }

export default function AuditLog() {
  const { auditLog } = useData();
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<'ALL' | AuditLogEntry['entityType']>('ALL');

  const filtered = useMemo(() => {
    let list = auditLog;
    if (entityType !== 'ALL') list = list.filter(e => e.entityType === entityType);
    if (search) { const q = search.toLowerCase(); list = list.filter(e => e.entityId.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q)); }
    return list;
  }, [auditLog, entityType, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Audit Log</h1>
        <p className="text-sm text-slate-500">Immutable trail of every state change across the PO-to-Lease process, for compliance and traceability.</p>
      </div>
      <div className="a360-card p-3 flex flex-wrap gap-3 items-center">
        <input className="a360-input max-w-xs" placeholder="Search by entity ID, action, or actor..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="a360-input max-w-[200px]" value={entityType} onChange={e => setEntityType(e.target.value as any)}>
          <option value="ALL">All Entity Types</option>
          <option>PO</option><option>PR</option><option>VendorOrder</option><option>GRN</option>
          <option>Invoice</option><option>Lease</option><option>Asset</option><option>Catalog</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} entries</span>
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Timestamp</th><th className="a360-th">Action</th><th className="a360-th">Entity</th>
            <th className="a360-th">Entity ID</th><th className="a360-th">Actor</th><th className="a360-th">Details</th>
          </tr></thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="a360-td text-slate-500 whitespace-nowrap">{fmt(e.timestamp)}</td>
                <td className="a360-td font-medium text-brand-700">{e.action.replace(/_/g,' ')}</td>
                <td className="a360-td">{e.entityType}</td>
                <td className="a360-td text-slate-500">{e.entityId}</td>
                <td className="a360-td">{e.actor}</td>
                <td className="a360-td text-slate-600">{e.details}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="a360-td text-center text-slate-400 py-8">No audit entries match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
