import { useData } from '../../store/DataContext';

interface Props {
  voId: string | null;
  onClose: () => void;
  onConfirm: (voId: string) => void;
}

export default function VendorRequestPreview({ voId, onClose, onConfirm }: Props) {
  const { vendorOrders, purchaseOrders, catalog } = useData();
  if (!voId) return null;
  const vo = vendorOrders.find(v => v.id === voId);
  if (!vo) return null;
  const po = purchaseOrders.find(p => p.id === vo.poId);
  const catalogName = po ? (catalog.find(c => c.id === po.catalogItemId)?.name ?? po.catalogItemId) : '—';

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cognizant purchase order</p>
          <h2 className="text-lg font-bold text-slate-800">Send {vo.cognizantPoNumber} to {vo.vendor}</h2>
          <p className="text-sm text-slate-500 mt-1">Review the order details below before this is transmitted to {vo.vendor} via {vo.channel}.</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="a360-label mb-2">Cognizant PO (going to the vendor)</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Cognizant PO Number</span><p className="font-medium text-slate-800">{vo.cognizantPoNumber}</p></div>
              <div><span className="text-slate-500">Vendor</span><p className="font-medium text-slate-800">{vo.vendor}</p></div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="a360-label mb-2">Customer PO this fulfills</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Customer PO Number</span><p className="font-medium text-slate-800">{po?.poNumber ?? '—'}</p></div>
              <div><span className="text-slate-500">Client</span><p className="font-medium text-slate-800">{po?.clientName ?? '—'}</p></div>
              <div><span className="text-slate-500">Asset360 Customer PO ID</span><p className="font-medium text-slate-800">{vo.poId}</p></div>
              <div><span className="text-slate-500">Request ID</span><p className="font-medium text-slate-800">{vo.requestId}</p></div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="a360-label mb-2">Order details</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Vendor SKU</span><p className="font-medium text-slate-800">{vo.vendorSku}</p></div>
              <div><span className="text-slate-500">Catalog item</span><p className="font-medium text-slate-800">{catalogName}</p></div>
              <div><span className="text-slate-500">Quantity</span><p className="font-medium text-slate-800">{vo.quantity} units</p></div>
              <div><span className="text-slate-500">Unit cost</span><p className="font-medium text-slate-800">${vo.unitCost.toLocaleString()}</p></div>
              <div><span className="text-slate-500">Total cost</span><p className="font-medium text-slate-800">${(vo.unitCost * vo.quantity).toLocaleString()}</p></div>
              <div><span className="text-slate-500">Procurement channel</span><p className="font-medium text-slate-800">{vo.channel}</p></div>
              <div><span className="text-slate-500">Destination</span><p className="font-medium text-slate-800">{vo.destination}</p></div>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button className="a360-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="a360-btn-primary" onClick={() => onConfirm(vo.id)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
