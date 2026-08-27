import { useState } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Timeline from '../../components/ui/Timeline';
import type { ShipmentStatus } from '../../types/models';

export default function ShipmentTracking() {
  const { vendorOrders, purchaseOrders, addShipmentEvent } = useData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const activeOrders = vendorOrders.filter(vo => vo.status !== 'DRAFT' && vo.status !== 'CANCELLED');
  const getPoNumber = (poId: string) => purchaseOrders.find(p => p.id === poId)?.poNumber ?? poId;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shipment Tracking</h1>
        <p className="text-slate-500 text-sm">{activeOrders.length} active shipments</p>
      </div>

      <div className="space-y-3">
        {activeOrders.map(vo => (
          <div key={vo.id} className="a360-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedId(expandedId === vo.id ? null : vo.id)}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-mono text-xs text-slate-500">{vo.cognizantPoNumber}</p>
                  <p className="font-semibold text-slate-800">{vo.vendor} — {vo.quantity} units</p>
                  <p className="text-xs text-slate-500">Customer PO: {getPoNumber(vo.poId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={vo.shipmentStatus ?? vo.status} />
                {vo.eta && <span className="text-xs text-slate-500">ETA: {vo.eta}</span>}
                {vo.trackingNumber && <span className="font-mono text-xs text-slate-500">{vo.trackingNumber}</span>}
                <span className="text-slate-400">{expandedId === vo.id ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandedId === vo.id && (
              <div className="px-5 pb-5 border-t border-slate-100">
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <Timeline events={vo.shipmentHistory} />
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Add Shipment Event</p>
                    <input value={locationInput} onChange={e => setLocationInput(e.target.value)} className="a360-input" placeholder="Location (optional)" />
                    <input value={noteInput} onChange={e => setNoteInput(e.target.value)} className="a360-input" placeholder="Note (optional)" />
                    <div className="flex gap-2 flex-wrap">
                      {(['LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'] as ShipmentStatus[]).map(s => (
                        <button key={s} onClick={() => { addShipmentEvent(vo.id, s, locationInput || undefined, noteInput || undefined); setLocationInput(''); setNoteInput(''); }} className="a360-btn-secondary text-xs py-1.5">
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div className="a360-card p-8 text-center text-slate-400">No active shipments.</div>
        )}
      </div>
    </div>
  );
}
