import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import VendorRequestPreview from '../../components/ui/VendorRequestPreview';
import { MODEL_CATEGORIES } from '../../types/models';
import type { ModelCategory, VendorName } from '../../types/models';

export default function VendorOrderCreate() {
  const { catalog, purchaseOrders, purchaseRequisitions, createVendorOrder, submitVendorOrder, markPrConverted, fulfillFromWarehouse } = useData();
  const [vrModelCategory, setVrModelCategory] = useState<ModelCategory | ''>('');
  const [vrCurrentGen, setVrCurrentGen] = useState('');
  const [vrSku1, setVrSku1] = useState('');
  const [vrVendor, setVrVendor] = useState<VendorName | ''>('');
  const [vrQuantity, setVrQuantity] = useState(1);
  const [vrUnitCost, setVrUnitCost] = useState(0);
  const [vrCatalogItemId, setVrCatalogItemId] = useState('');
  const [vrCognizantPo, setVrCognizantPo] = useState('');
  const [vrChannel, setVrChannel] = useState<VendorName extends string ? VendorOrderCreate['channel'] : 'Webshop Portal'>('Webshop Portal' as const);
  const [vrDestination, setVrDestination] = useState<'Cognizant Warehouse' | 'Client Office'>('Cognizant Warehouse');
  const [vrWarehouseAddress, setVrWarehouseAddress] = useState('');
  const [vrError, setVrError] = useState('');
  const [previewVoId, setPreviewVoId] = useState<string | null>(null);
  const [newCatalogItemName, setNewCatalogItemName] = useState('');
  const [customCatalogItems, setCustomCatalogItems] = useState<{id:string;name:string}[]>([]);

  const totalCost = (Number(vrQuantity)||0) * (Number(vrUnitCost)||0);

  const filteredCatalogItems = useMemo(() =>
    vrModelCategory ? catalog.filter(c => c.modelCategory === vrModelCategory) : catalog,
    [catalog, vrModelCategory]);

  const currentGenOptions = useMemo(() => [...new Set(filteredCatalogItems.map(c => c.currentGenModel))], [filteredCatalogItems]);
  const sku1Options = useMemo(() => {
    if (!vrCurrentGen) return [...new Set(filteredCatalogItems.map(c => c.currentGenSku))];
    return [...new Set(filteredCatalogItems.filter(c => c.currentGenModel === vrCurrentGen).map(c => c.currentGenSku))];
  }, [filteredCatalogItems, vrCurrentGen]);

  const vendorOptions = useMemo((): VendorName[] => {
    const item = vrCatalogItemId ? catalog.find(c => c.id === vrCatalogItemId) : filteredCatalogItems.find(c => c.currentGenModel === vrCurrentGen);
    if (!item) return ['Dell','Lenovo','HP'];
    return item.vendorMappings.map(m => m.vendor) as VendorName[];
  }, [catalog, filteredCatalogItems, vrCatalogItemId, vrCurrentGen]);

  const selectedCatalogItem = vrCatalogItemId ? catalog.find(c => c.id === vrCatalogItemId) : filteredCatalogItems.find(c => c.currentGenModel === vrCurrentGen);

  function onModelCategoryChange(cat: ModelCategory) {
    setVrModelCategory(cat); setVrCurrentGen(''); setVrSku1(''); setVrCatalogItemId('');
    const first = catalog.filter(c => c.modelCategory === cat)[0];
    if (first) { setVrCurrentGen(first.currentGenModel); setVrSku1(first.currentGenSku); setVrCatalogItemId(first.id); setVrUnitCost(first.vendorMappings[0]?.unitCost ?? 0); }
  }
  function onCurrentGenChange(val: string) {
    setVrCurrentGen(val);
    const match = filteredCatalogItems.find(c => c.currentGenModel === val);
    setVrSku1(match?.currentGenSku ?? ''); setVrCatalogItemId(match?.id ?? '');
    if (match) { const vm = vrVendor ? match.vendorMappings.find(m => m.vendor === vrVendor) : match.vendorMappings[0]; setVrUnitCost(vm?.unitCost ?? 0); }
  }
  function onCatalogItemChange(id: string) {
    setVrCatalogItemId(id);
    const item = catalog.find(c => c.id === id);
    if (item) { setVrCurrentGen(item.currentGenModel); setVrSku1(item.currentGenSku); setVrModelCategory(item.modelCategory); const vm = vrVendor ? item.vendorMappings.find(m => m.vendor === vrVendor) : item.vendorMappings[0]; if (vm) { setVrVendor(vm.vendor); setVrUnitCost(vm.unitCost); } }
  }
  function onVendorChange(v: VendorName) {
    setVrVendor(v);
    const item = selectedCatalogItem;
    if (item) { const vm = item.vendorMappings.find(m => m.vendor === v); if (vm) setVrUnitCost(vm.unitCost); }
  }

  const approvedPRs = useMemo(() => purchaseRequisitions.filter(pr => pr.status === 'APPROVED'), [purchaseRequisitions]);

  function submitVendorRequest() {
    const pr = approvedPRs[0] ?? null;
    const po = pr ? purchaseOrders.find(p => p.id === pr.poId) : null;
    const fallbackPo = purchaseOrders.find(p => p.status === 'APPROVED');
    if (pr && po && pr.inStockQty > 0) fulfillFromWarehouse(po.id, pr.catalogItemId, pr.inStockQty);
    const vo = createVendorOrder({
      poId: po?.id ?? fallbackPo?.id ?? 'MANUAL',
      requestId: po?.requestId ?? fallbackPo?.requestId ?? 'MANUAL',
      prId: pr?.id, vendor: vrVendor as VendorName, vendorSku: vrSku1,
      channel: vrChannel as 'Webshop Portal' | 'Integrated Procurement API' | 'EDI',
      quantity: Number(vrQuantity), unitCost: Number(vrUnitCost), destination: vrDestination,
      warehouseAddress: vrWarehouseAddress, modelCategory: vrModelCategory as ModelCategory,
      currentGeneration: vrCurrentGen, sku1NonModern: vrSku1,
      catalogItemId: vrCatalogItemId || (selectedCatalogItem?.id ?? ''),
      cognizantPoOverride: vrCognizantPo,
    });
    if (pr) markPrConverted(pr.id);
    setPreviewVoId(vo.id);
    setVrModelCategory(''); setVrCurrentGen(''); setVrSku1(''); setVrVendor(''); setVrQuantity(1); setVrUnitCost(0); setVrCatalogItemId(''); setVrCognizantPo(''); setVrChannel('Webshop Portal' as any); setVrDestination('Cognizant Warehouse'); setVrWarehouseAddress(''); setVrError('');
  }

  function addCustomCatalogItem() {
    const name = newCatalogItemName.trim(); if (!name) return;
    const item = { id:`CUSTOM-${Date.now()}`, name };
    setCustomCatalogItems(l => [...l, item]); setVrCatalogItemId(item.id); setNewCatalogItemName('');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Procurement</h1>
        <p className="text-sm text-slate-500">Raises a Cognizant PO to a vendor against an <strong>approved Purchase Requisition</strong> — stock and on-order quantities were already checked when that requisition was created.</p>
      </div>

      <div className="a360-card p-5 space-y-5">
        <h2 className="text-sm font-semibold text-slate-800">Vendor Request Form</h2>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Model &amp; Generation</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Model Category</label>
              <select className="a360-input" value={vrModelCategory} onChange={e => onModelCategoryChange(e.target.value as ModelCategory)} required>
                <option value="" disabled>Select model category...</option>
                {MODEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="a360-label">Current Generation</label>
              <select className="a360-input" value={vrCurrentGen} onChange={e => onCurrentGenChange(e.target.value)} required>
                <option value="" disabled>Select current generation...</option>
                {currentGenOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="a360-label">SKU 1 Non Modern</label>
              <select className="a360-input" value={vrSku1} onChange={e => setVrSku1(e.target.value)} required>
                <option value="" disabled>Select SKU...</option>
                {sku1Options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedCatalogItem && (
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-xs space-y-3">
            <p className="font-semibold text-brand-700 uppercase tracking-wide">Catalog — {selectedCatalogItem.modelCategory} <span className="ml-2 normal-case font-normal text-brand-500">{selectedCatalogItem.eolTimeline}</span></p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div><p className="text-slate-400 font-medium">Current Gen Config</p><p className="text-slate-700">{selectedCatalogItem.currentGenConfigDetails}</p></div>
              <div><p className="text-slate-400 font-medium">New Gen Config</p><p className="text-slate-700">{selectedCatalogItem.newGenConfigDetails}</p></div>
              <div><p className="text-slate-400 font-medium">Current Gen SKU</p><code className="text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedCatalogItem.currentGenSku}</code></div>
              <div><p className="text-slate-400 font-medium">New Gen SKU</p><code className="text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedCatalogItem.newGenSku}</code></div>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Vendor &amp; Quantity</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="a360-label">Vendor</label>
              <select className="a360-input" value={vrVendor} onChange={e => onVendorChange(e.target.value as VendorName)} required>
                <option value="" disabled>Select vendor...</option>
                {vendorOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="a360-label">Quantity</label>
              <input className="a360-input" type="number" min="1" value={vrQuantity} onChange={e => setVrQuantity(Number(e.target.value))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="a360-label">Unit Cost (USD)</label>
              <input className="a360-input" type="number" min="0" step="0.01" value={vrUnitCost} onChange={e => setVrUnitCost(Number(e.target.value))} placeholder="0.00" required />
            </div>
            <div>
              <label className="a360-label">Total Cost</label>
              <div className="a360-input bg-slate-50 font-semibold text-slate-800 flex items-center justify-between cursor-not-allowed">
                <span className="text-slate-400 font-normal text-xs">USD</span>
                <span>{totalCost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="a360-label">Catalog Item <span className="text-slate-400 font-normal">(from catalog)</span></label>
            <div className="flex gap-2">
              <select className="a360-input flex-1" value={vrCatalogItemId} onChange={e => onCatalogItemChange(e.target.value)}>
                <option value="">Select from catalog...</option>
                {filteredCatalogItems.map(item => <option key={item.id} value={item.id}>{item.currentGenModel} — {item.currentGenSku}</option>)}
                {customCatalogItems.map(item => <option key={item.id} value={item.id}>{item.name} (Custom)</option>)}
              </select>
              <input type="text" className="a360-input w-64" value={newCatalogItemName} onChange={e => setNewCatalogItemName(e.target.value)} placeholder="Custom catalog item..." />
              <button type="button" className="a360-btn-primary px-4" onClick={addCustomCatalogItem}>+</button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">PO &amp; Channel</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Cognizant PO</label>
              <input className="a360-input" type="text" value={vrCognizantPo} onChange={e => setVrCognizantPo(e.target.value)} placeholder="e.g. CGZ-PO-2026-00200" required />
            </div>
            <div>
              <label className="a360-label">Procurement Channel</label>
              <select className="a360-input" value={vrChannel} onChange={e => setVrChannel(e.target.value as any)} required>
                <option>Webshop Portal</option>
                <option>Integrated Procurement API</option>
                <option>EDI</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Destination</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Destination</label>
              <select className="a360-input" value={vrDestination} onChange={e => { setVrDestination(e.target.value as any); setVrWarehouseAddress(''); }} required>
                <option>Cognizant Warehouse</option>
                <option>Client Office</option>
              </select>
            </div>
            <div>
              <label className="a360-label">{vrDestination === 'Cognizant Warehouse' ? 'Cognizant Warehouse Address' : 'Client Office Address'}</label>
              <textarea className="a360-input" rows={4} value={vrWarehouseAddress} onChange={e => setVrWarehouseAddress(e.target.value)} placeholder={vrDestination === 'Cognizant Warehouse' ? 'Enter Cognizant warehouse address...' : 'Enter client office delivery address...'} />
            </div>
          </div>
        </div>

        {vrError && <p className="text-sm text-rose-600">{vrError}</p>}
        <div className="pt-1 border-t border-slate-100">
          <button type="button" onClick={submitVendorRequest} className="a360-btn-primary">+ Add Vendor Request</button>
        </div>
      </div>

      <VendorRequestPreview voId={previewVoId} onClose={() => setPreviewVoId(null)} onConfirm={voId => { submitVendorOrder(voId); setPreviewVoId(null); }} />
    </div>
  );
}

// type alias to satisfy TypeScript
type VendorOrderCreate = { channel: 'Webshop Portal' | 'Integrated Procurement API' | 'EDI' };
