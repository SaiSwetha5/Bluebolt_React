import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import VendorRequestPreview from '../../components/ui/VendorRequestPreview';
import type { VendorOrderStatus } from '../../types/models';

const FILTERS: ('ALL' | VendorOrderStatus)[] = ['ALL','DRAFT','SUBMITTED','CONFIRMED','IN_PRODUCTION','SHIPPED','DELIVERED','CANCELLED'];

export default function VendorOrderList() {
  const { vendorOrders, submitVendorOrder, advanceVendorOrderStatus, addShipmentEvent } = useData();
  const [active, setActive] = useState<'ALL' | VendorOrderStatus>('ALL');
  const [previewVoId, setPreviewVoId] = useState<string | null>(null);
  const filtered = active === 'ALL' ? vendorOrders : vendorOrders.filter(v => v.status === active);

  function sendToVendor(voId: string) { submitVendorOrder(voId); setPreviewVoId(null); }
  function markShipped(voId: string) { advanceVendorOrderStatus(voId,'SHIPPED'); addShipmentEvent(voId,'IN_TRANSIT'); }
  function markDelivered(voId: string) { advanceVendorOrderStatus(voId,'DELIVERED'); addShipmentEvent(voId,'DELIVERED'); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Vendor Requests</h1>
          <p className="text-sm text-slate-500">Cognizant POs raised against OEM vendors (Dell, Lenovo, HP) to fulfill approved customer POs.</p>
        </div>
        <Link to="/procurement/orders/new" className="a360-btn-primary">+ New Vendor Request</Link>
      </div>
      <div className="a360-card p-3 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActive(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${active===f?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {f==='ALL'?'All':f.replace(/_/g,' ')}
          </button>
        ))}
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Cognizant PO</th><th className="a360-th">Customer PO</th><th className="a360-th">Purchase Requisition</th>
            <th className="a360-th">Vendor</th><th className="a360-th">SKU</th><th className="a360-th">Channel</th>
            <th className="a360-th">Qty</th><th className="a360-th">Destination</th><th className="a360-th">Status</th>
            <th className="a360-th">Shipment</th><th className="a360-th">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(vo => (
              <tr key={vo.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{vo.cognizantPoNumber}</td>
                <td className="a360-td text-slate-500">{vo.poId}</td>
                <td className="a360-td text-slate-500">{vo.prId ?? '—'}</td>
                <td className="a360-td font-medium">{vo.vendor}</td>
                <td className="a360-td">{vo.vendorSku}</td>
                <td className="a360-td text-slate-500">{vo.channel}</td>
                <td className="a360-td">{vo.quantity}</td>
                <td className="a360-td text-slate-500">{vo.destination}</td>
                <td className="a360-td"><StatusBadge status={vo.status} /></td>
                <td className="a360-td">{vo.shipmentStatus ? <StatusBadge status={vo.shipmentStatus} /> : <span className="text-slate-400 text-xs">—</span>}</td>
                <td className="a360-td">
                  {vo.status === 'DRAFT' && <button onClick={() => setPreviewVoId(vo.id)} className="a360-btn-primary text-xs px-2.5 py-1">Send to vendor</button>}
                  {(vo.status==='SUBMITTED'||vo.status==='CONFIRMED'||vo.status==='IN_PRODUCTION') && <button onClick={() => markShipped(vo.id)} className="a360-btn-primary text-xs px-2.5 py-1">Mark shipped</button>}
                  {vo.status==='SHIPPED' && <button onClick={() => markDelivered(vo.id)} className="a360-btn-primary text-xs px-2.5 py-1">Mark delivered</button>}
                  {vo.status==='DELIVERED' && <span className="text-xs text-slate-400">Awaiting GRN</span>}
                  {vo.status==='CANCELLED' && <span className="text-xs text-slate-400">Cancelled</span>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={11} className="a360-td text-center text-slate-400 py-8">No vendor orders in this state.</td></tr>}
          </tbody>
        </table>
      </div>
      <VendorRequestPreview voId={previewVoId} onClose={() => setPreviewVoId(null)} onConfirm={sendToVendor} />
    </div>
  );
}
