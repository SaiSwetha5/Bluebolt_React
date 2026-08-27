import { useNavigate } from 'react-router-dom';
import { useData } from '../store/DataContext';

interface StatCardProps { label: string; value: number | string; color: string; onClick?: () => void; }
function StatCard({ label, value, color, onClick }: StatCardProps) {
  return (
    <div className={`a360-card p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { dashboardStats, purchaseOrders, vendorOrders } = useData();
  const navigate = useNavigate();
  const s = dashboardStats;

  const recentPOs = purchaseOrders.slice(0, 5);
  const recentVOs = vendorOrders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Asset360 — PO-to-Lease Fulfillment Overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Purchase Orders" value={s.totalPOs} color="text-brand-600" onClick={() => navigate('/po')} />
        <StatCard label="Pending Approval" value={s.pendingApproval} color="text-amber-600" onClick={() => navigate('/po')} />
        <StatCard label="Approved POs" value={s.approved} color="text-emerald-600" onClick={() => navigate('/po')} />
        <StatCard label="Devices Requested" value={s.totalDevicesRequested.toLocaleString()} color="text-slate-700" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In Procurement" value={s.inProcurement} color="text-blue-600" onClick={() => navigate('/procurement/vendor-orders')} />
        <StatCard label="In Transit" value={s.inTransit} color="text-purple-600" onClick={() => navigate('/warehouse/shipment')} />
        <StatCard label="Delivered" value={s.delivered} color="text-emerald-600" />
        <StatCard label="Invoice Exceptions" value={s.invoiceExceptions} color="text-rose-600" onClick={() => navigate('/finance/invoices')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={s.totalAssets} color="text-slate-700" onClick={() => navigate('/inventory/assets')} />
        <StatCard label="Deployed Assets" value={s.deployedAssets} color="text-emerald-600" onClick={() => navigate('/inventory/assets')} />
        <StatCard label="Pending PR Approvals" value={s.pendingPrApprovals} color="text-amber-600" onClick={() => navigate('/procurement/pr')} />
        <StatCard label="Notifications" value={s.unreadNotifications} color="text-brand-600" />
      </div>

      {/* Recent POs */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="a360-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Purchase Orders</h2>
            <button onClick={() => navigate('/po')} className="text-xs text-brand-600 hover:underline">View all</button>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="a360-th">PO #</th>
                <th className="a360-th">Client</th>
                <th className="a360-th">Qty</th>
                <th className="a360-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map(po => (
                <tr key={po.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/po/${po.id}`)}>
                  <td className="a360-td font-mono text-xs">{po.poNumber}</td>
                  <td className="a360-td">{po.clientName}</td>
                  <td className="a360-td">{po.quantity}</td>
                  <td className="a360-td">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${po.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : po.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {po.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="a360-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Vendor Orders</h2>
            <button onClick={() => navigate('/procurement/vendor-orders')} className="text-xs text-brand-600 hover:underline">View all</button>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="a360-th">Cognizant PO</th>
                <th className="a360-th">Vendor</th>
                <th className="a360-th">Qty</th>
                <th className="a360-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentVOs.map(vo => (
                <tr key={vo.id} className="hover:bg-slate-50">
                  <td className="a360-td font-mono text-xs">{vo.cognizantPoNumber}</td>
                  <td className="a360-td">{vo.vendor}</td>
                  <td className="a360-td">{vo.quantity}</td>
                  <td className="a360-td">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${vo.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : vo.status === 'SHIPPED' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {vo.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
