import { useParams, Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import AuditLogPanel from '../../components/ui/AuditLogPanel';

function fmt(ts?: string) { if (!ts) return '—'; return new Date(ts).toLocaleDateString(); }

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const { assets, auditFor, retireAsset } = useData();
  const a = assets.find(x => x.assetId === id);
  const audit = auditFor(id ?? '');

  if (!a) return <div className="text-center text-slate-400 py-16">Asset not found.</div>;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/inventory" className="text-sm text-slate-500 hover:text-brand-600">← Back to Inventory</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-lg font-bold text-slate-800">{a.assetId}</h1>
          <StatusBadge status={a.lifecycleStatus} />
        </div>
        <p className="text-sm text-slate-500">{a.vendor} {a.model} · SN {a.serialNumber}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="a360-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Asset Information</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Device Type</dt><dd className="font-medium">{a.deviceType}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Vendor</dt><dd className="font-medium">{a.vendor}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Model</dt><dd className="font-medium">{a.model}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Cost</dt><dd className="font-medium">${a.cost.toLocaleString()}</dd></div>
            </dl>
          </div>
          <div className="a360-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Lease &amp; Contract</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Lease Start</dt><dd className="font-medium">{fmt(a.leaseStartDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Lease End</dt><dd className="font-medium">{fmt(a.leaseEndDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Contract</dt><dd className="font-medium">{a.contract || '—'}</dd></div>
            </dl>
          </div>
          <div className="a360-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Assignment</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Assigned User</dt><dd className="font-medium">{a.assignedUser || 'Unassigned'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Location</dt><dd className="font-medium">{a.location}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Shipment Status</dt><dd className="font-medium">{a.shipmentStatus}</dd></div>
            </dl>
          </div>
          <div className="a360-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Source Traceability</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">PO</dt><dd className="font-medium text-brand-700"><Link to={`/po/${a.poId}`} className="hover:underline">{a.poId}</Link></dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Vendor Order</dt><dd className="font-medium">{a.vendorOrderId || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">GRN</dt><dd className="font-medium">{a.grnId || '—'}</dd></div>
            </dl>
          </div>
          <div className="col-span-2 flex gap-2">
            {a.lifecycleStatus !== 'RETIRED' && <button onClick={() => retireAsset(a.assetId)} className="a360-btn-danger text-sm">Retire Asset</button>}
          </div>
        </div>
        <div><AuditLogPanel entries={audit} /></div>
      </div>
    </div>
  );
}
