import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Timeline from '../../components/ui/Timeline';
import type { TimelineStep } from '../../components/ui/Timeline';
import type { ShipmentStatus, VendorOrder } from '../../types/models';

const FLOW: ShipmentStatus[] = ['PENDING','LABEL_CREATED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED'];
const FILTERS: ('ALL' | ShipmentStatus)[] = ['ALL','PENDING','LABEL_CREATED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION'];

function stepsFor(vo: VendorOrder): TimelineStep[] {
  const currentIdx = FLOW.indexOf(vo.shipmentStatus ?? 'PENDING');
  return FLOW.map((s, i) => {
    const event = vo.shipmentHistory.find(h => h.status === s);
    return { label: s.replace(/_/g,' '), timestamp: event?.timestamp, sublabel: event?.location, state: i < currentIdx ? 'done' : i === currentIdx ? 'done' : 'pending' };
  });
}

function nextStatus(vo: VendorOrder): ShipmentStatus | null {
  const idx = FLOW.indexOf(vo.shipmentStatus ?? 'PENDING');
  return idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
}

export default function ShipmentTracking() {
  const { vendorOrders, addShipmentEvent } = useData();
  const [active, setActive] = useState<'ALL' | ShipmentStatus>('ALL');
  const filtered = useMemo(() =>
    active === 'ALL' ? vendorOrders : vendorOrders.filter(v => (v.shipmentStatus ?? 'PENDING') === active),
    [vendorOrders, active]);

  function advance(vo: VendorOrder) {
    const next = nextStatus(vo); if (!next) return;
    const locations: Record<string, string> = { LABEL_CREATED:`${vo.vendor} Fulfillment Center`, IN_TRANSIT:'In-transit hub', OUT_FOR_DELIVERY:`${vo.destination} - local hub`, DELIVERED:vo.destination };
    addShipmentEvent(vo.id, next, locations[next]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Shipment Tracking</h1>
        <p className="text-sm text-slate-500">Live status across warehouse and client-direct deliveries.</p>
      </div>
      <div className="a360-card p-3 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActive(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${active===f?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {f==='ALL'?'All Orders':f.replace(/_/g,' ')}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.map(vo => (
          <div key={vo.id} className="a360-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{vo.id} · {vo.vendor} · {vo.quantity} units</p>
                <p className="text-xs text-slate-500">{vo.poId} → {vo.destination}</p>
              </div>
              <StatusBadge status={vo.shipmentStatus ?? 'PENDING'} />
            </div>
            <Timeline steps={stepsFor(vo)} />
            {nextStatus(vo) && (
              <div className="flex items-center justify-end gap-2 mt-2">
                <button onClick={() => advance(vo)} className="a360-btn-secondary text-xs">Advance to: {nextStatus(vo)!.replace(/_/g,' ')}</button>
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <div className="text-center text-slate-400 py-12">No vendor orders match this filter.</div>}
      </div>
    </div>
  );
}
