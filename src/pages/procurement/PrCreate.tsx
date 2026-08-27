import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import type { VendorName } from '../../types/models';

export default function PrCreate() {
  const { purchaseOrders, catalog, assets, createPurchaseRequisition } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPoId, setSelectedPoId] = useState(searchParams.get('poId') ?? '');
  const [requestedQty, setRequestedQty] = useState(0);
  const [preferredVendor, setPreferredVendor] = useState<VendorName>('HP');
  const [estimatedUnitCost, setEstimatedUnitCost] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedPo = purchaseOrders.find(p => p.id === selectedPoId || p.poNumber === selectedPoId) ?? null;
  const selectedCatalogItem = selectedPo ? catalog.find(c => c.id === selectedPo.catalogItemId) ?? null : null;
  const vendorOptions = selectedCatalogItem?.vendorMappings?.length ? selectedCatalogItem.vendorMappings : [{ vendor:'HP' as VendorName, unitCost:1420 }, { vendor:'Dell' as VendorName, unitCost:1510 }, { vendor:'Lenovo' as VendorName, unitCost:1495 }];
  const totalCmdbInStock = useMemo(() => assets.filter(a => a.lifecycleStatus === 'IN_STOCK').length, [assets]);
  const totalInTransit = useMemo(() => assets.filter(a => a.shipmentStatus === 'IN_TRANSIT').length, [assets]);
  const totalAllocated = useMemo(() => assets.filter(a => a.lifecycleStatus === 'DEPLOYED').length, [assets]);
  const cognizantWarehouseQty = totalCmdbInStock;
  const balanceQuantity = Math.max(0, (Number(requestedQty) || 0) - cognizantWarehouseQty);
  const qtyError = selectedPo && (!requestedQty || requestedQty <= 0) ? 'Quantity must be at least 1.' : '';
  const getCatalogName = (id: string) => { const item = catalog.find(c => c.id === id); return item ? `${item.currentGenModel} (${item.currentGenSku})` : id; };

  function onPoChange(poId: string) {
    setErrorMessage(''); setSelectedPoId(poId);
    const po = purchaseOrders.find(p => p.id === poId || p.poNumber === poId);
    if (po) {
      setRequestedQty(po.quantity); setEstimatedUnitCost(po.unitCost);
      const cat = catalog.find(c => c.id === po.catalogItemId);
      const mappings = cat?.vendorMappings ?? [];
      const mapping = mappings.find(v => v.vendor === preferredVendor) ?? mappings[0];
      if (mapping) { setPreferredVendor(mapping.vendor as VendorName); setEstimatedUnitCost(mapping.unitCost); }
    }
  }

  function submit() {
    if (!selectedPo) { setErrorMessage('Please select a valid Customer PO.'); return; }
    if (qtyError) return;
    try {
      const pr = createPurchaseRequisition({ poId:selectedPo.id, requestedQty:Number(requestedQty)||1, preferredVendor, estimatedUnitCost:Number(estimatedUnitCost)||0, costCenter:'CC-APAC-IT-01', justification:`Hardware procurement for PO ${selectedPo.poNumber||selectedPo.id}`, requestedBy:'Procurement Lead' });
      navigate(`/procurement/requisitions/${pr.id}`);
    } catch (err: any) { setErrorMessage(err?.message || 'Failed to create purchase requisition.'); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link to="/procurement/requisitions" className="text-sm text-slate-500 hover:text-brand-600">← Back to Purchase Requisitions</Link>
        <h1 className="text-lg font-bold text-slate-800 mt-1">New Purchase Requisition</h1>
        <p className="text-sm text-slate-500">Requests procurement against a Customer PO. The balance quantity is what still needs to be ordered from a vendor after netting out available warehouse stock.</p>
      </div>

      <div className="a360-card p-5 space-y-4">
        <div>
          <label className="a360-label">CUSTOMER PO <span className="text-rose-500">*</span></label>
          <select className="a360-input" value={selectedPoId} onChange={e => onPoChange(e.target.value)} required>
            <option value="" disabled>Select Customer PO...</option>
            {purchaseOrders.map(po => (
              <option key={po.id} value={po.id}>{po.poNumber} — {po.clientName} ({po.quantity} units, {getCatalogName(po.catalogItemId)})</option>
            ))}
          </select>
          {!purchaseOrders.length && <p className="text-sm text-amber-600 mt-2">No customer POs available yet.</p>}
        </div>

        {selectedCatalogItem && (
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-xs space-y-3">
            <p className="font-semibold text-brand-700 uppercase tracking-wide">Catalog Item — {selectedCatalogItem.name || selectedCatalogItem.modelCategory}</p>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-slate-400 font-medium">Current gen</p><p className="text-slate-700 font-semibold">{selectedCatalogItem.currentGenModel}</p><span className="inline-block mt-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-700">{selectedCatalogItem.currentGenSku}</span></div>
              <div><p className="text-slate-400 font-medium">New gen</p><p className="text-slate-700 font-semibold">{selectedCatalogItem.newGenModel||'TBD'}</p><span className="inline-block mt-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-mono text-[11px]">{selectedCatalogItem.newGenSku||'WIP'}</span></div>
              <div><p className="text-slate-400 font-medium">Config</p><p className="text-slate-700">{selectedCatalogItem.currentGenConfigDetails}</p></div>
              <div><p className="text-slate-400 font-medium">EOL timeline</p><p className="text-amber-600 font-medium">{selectedCatalogItem.eolTimeline}</p></div>
            </div>
          </div>
        )}

        {selectedPo && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="a360-label">REQUESTED QUANTITY</label>
                <input className="a360-input" type="number" min="1" value={requestedQty} onChange={e => setRequestedQty(Number(e.target.value))} required />
                {qtyError && <p className="text-xs text-rose-600 mt-1">{qtyError}</p>}
              </div>
              <div>
                <label className="a360-label">PREFERRED VENDOR</label>
                <select className="a360-input" value={preferredVendor} onChange={e => setPreferredVendor(e.target.value as VendorName)}>
                  {vendorOptions.map(v => <option key={v.vendor} value={v.vendor}>{v.vendor}</option>)}
                </select>
              </div>
              <div>
                <label className="a360-label">ESTIMATED UNIT COST (USD)</label>
                <input className="a360-input" type="number" min="0" step="0.01" value={estimatedUnitCost} onChange={e => setEstimatedUnitCost(Number(e.target.value))} required />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">COGNIZANT WAREHOUSE (INVENTORY / CMDB)</h3>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Live CMDB Sync</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { label:'Total CMDB In-Stock', val:totalCmdbInStock, sub:'Across all models', cls:'text-slate-800' },
                  { label:'Total In-Transit', val:totalInTransit, sub:'Incoming shipments', cls:'text-amber-600' },
                  { label:'Allocated / Active', val:totalAllocated, sub:'Deployed to users', cls:'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white/80 backdrop-blur rounded-lg border border-blue-100 p-3">
                    <p className="text-slate-500 font-medium">{s.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${s.cls}`}>{s.val}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">BALANCE QUANTITY CALCULATION</p>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-500">Requested Qty</p><p className="text-lg font-bold text-slate-800">{requestedQty}</p></div>
                <div><p className="text-xs text-slate-500">In Cognizant Warehouse</p><p className="text-lg font-bold text-slate-800">{cognizantWarehouseQty}</p><p className="text-[11px] text-slate-400">{cognizantWarehouseQty} asset(s) with <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px]">IN_STOCK</code> status</p></div>
                <div><p className="text-xs text-slate-500">Balance to Procure</p><p className={`text-lg font-bold ${balanceQuantity > 0 ? 'text-brand-600' : 'text-emerald-600'}`}>{balanceQuantity}</p><p className={`text-[11px] ${balanceQuantity > 0 ? 'text-brand-500' : 'text-emerald-600'}`}>{balanceQuantity > 0 ? 'needs vendor order' : 'fully covered by warehouse stock'}</p></div>
              </div>
              {balanceQuantity === 0 && requestedQty > 0 && <p className="mt-3 text-xs text-emerald-600 font-medium">✓ Warehouse stock fully covers this request — no vendor order needed.</p>}
              {balanceQuantity > 0 && cognizantWarehouseQty > 0 && <p className="mt-3 text-xs text-brand-600 font-medium">ℹ Partial stock applied: {cognizantWarehouseQty} available unit(s) deducted from total requisition.</p>}
            </div>

            {errorMessage && <p className="text-sm text-rose-600 font-medium">{errorMessage}</p>}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Link to="/procurement/requisitions" className="a360-btn-secondary">Cancel</Link>
              <button onClick={submit} className="a360-btn-primary" disabled={!selectedPoId || !!qtyError}>Create Requisition</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
