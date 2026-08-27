import type { AuditLogEntry } from '../../types/models';

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function AuditLogPanel({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <div className="a360-card">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 12h6M9 16h6"/></svg>
        <h3 className="text-sm font-semibold text-slate-800">Audit Trail</h3>
        <span className="text-xs text-slate-400">({entries.length})</span>
      </div>
      <ol className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {entries.map(e => (
          <li key={e.id} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-brand-700">{e.action.replace(/_/g, ' ')}</span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(e.timestamp)}</span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{e.details}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">by {e.actor}</p>
          </li>
        ))}
        {!entries.length && <li className="px-4 py-6 text-center text-sm text-slate-400">No audit entries yet.</li>}
      </ol>
    </div>
  );
}
