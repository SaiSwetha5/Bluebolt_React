import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

const FLOW_STEPS = [
  {n:1,label:'Client PO Intake'},{n:2,label:'Acknowledgment + Request ID'},{n:3,label:'Cognizant Approval'},
  {n:4,label:'Warehouse Notification'},{n:5,label:'Order to Dell / Lenovo / HP'},{n:6,label:'Vendor Shipment'},
  {n:7,label:'Warehouse / Client Delivery'},{n:8,label:'Proof of Delivery'},{n:9,label:'GRN Generation'},
  {n:10,label:'Invoice + Lease Schedule'},{n:11,label:'Accounts Payable'},{n:12,label:'CMDB / Lifecycle Update'},
];

export default function Dashboard() {
  const { dashboardStats, purchaseOrders } = useData();
  const s = dashboardStats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label:'Total POs', val:s.totalPOs, cls:'text-slate-800' },
          { label:'Pending Approval', val:s.pendingApproval, cls:'text-amber-600' },
          { label:'Approved', val:s.approved, cls:'text-emerald-600' },
          { label:'In Procurement', val:s.inProcurement, cls:'text-indigo-600' },
          { label:'In Transit', val:s.inTransit, cls:'text-violet-600' },
          { label:'Invoice Exceptions', val:s.invoiceExceptions, cls:'text-rose-600' },
        ].map(k => (
          <div key={k.label} className="a360-card p-4">
            <p className="text-xs text-slate-400 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.cls}`}>{k.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 a360-card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">End-to-End Fulfillment Flow</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FLOW_STEPS.map(st => (
              <div key={st.n} className="rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50/50 transition-colors">
                <p className="text-[11px] font-semibold text-brand-600">STEP {st.n}</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{st.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="a360-card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Fleet Summary</h2>
          <div className="space-y-3 text-sm">
            {[
              { label:'Devices requested (all POs)', val:s.totalDevicesRequested, cls:'text-slate-800' },
              { label:'Assets registered in CMDB', val:s.totalAssets, cls:'text-slate-800' },
              { label:'Deployed to end users', val:s.deployedAssets, cls:'text-emerald-600' },
              { label:'Delivered vendor orders', val:s.delivered, cls:'text-slate-800' },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-slate-500">{r.label}</span>
                <span className={`font-semibold ${r.cls}`}>{r.val}</span>
              </div>
            ))}
          </div>
          <Link to="/inventory" className="a360-btn-secondary w-full justify-center mt-4 text-sm">View CMDB</Link>
        </div>
      </div>

      <div className="a360-card">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent Purchase Orders</h2>
          <Link to="/po" className="text-sm text-brand-600 font-medium hover:underline">View all →</Link>
        </div>
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">PO ID</th><th className="a360-th">Client</th><th className="a360-th">Qty</th>
            <th className="a360-th">Source</th><th className="a360-th">Status</th>
          </tr></thead>
          <tbody>
            {purchaseOrders.slice(0, 6).map(po => (
              <tr key={po.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href=`/po/${po.id}`}>
                <td className="a360-td font-medium text-brand-700">{po.id}</td>
                <td className="a360-td">{po.clientName}</td>
                <td className="a360-td">{po.quantity}</td>
                <td className="a360-td">{po.source === 'PDF_IMPORT' ? 'PDF Import' : 'API'}</td>
                <td className="a360-td"><StatusBadge status={po.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
