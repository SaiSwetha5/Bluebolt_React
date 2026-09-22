import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import VendorRequestPreview from '../../components/ui/VendorRequestPreview';
import { MODEL_CATEGORIES } from '../../types/models';
import type { ModelCategory, VendorName } from '../../types/models';
import { useNavigate } from 'react-router-dom';

export default function VendorOrderCreate() {
  const { catalog, purchaseOrders, purchaseRequisitions, createVendorOrder, submitVendorOrder, markPrConverted, fulfillFromWarehouse } = useData();
  const [vrModelCategory, setVrModelCategory] = useState<ModelCategory | ''>('');
  const [vrCurrentGen, setVrCurrentGen] = useState('');
  const [vrSku1, setVrSku1] = useState('');
  const [vrVendor, setVrVendor] = useState<VendorName | ''>('');
  const [vrQuantity, setVrQuantity] = useState<number | ''>('');
  const [vrUnitCost, setVrUnitCost] = useState<number | ''>('');
  const [vrCatalogItemId, setVrCatalogItemId] = useState('');
  const [vrCognizantPo, setVrCognizantPo] = useState('');
  const [vrChannel, setVrChannel] = useState<VendorName extends string ? VendorOrderCreate['channel'] : 'Webshop Portal'>('Webshop Portal' as const);
  const [vrDestination, setVrDestination] = useState<'Cognizant Warehouse' | 'Client Office'>('Cognizant Warehouse');
  const [vrWarehouseAddress, setVrWarehouseAddress] = useState('');
  const [vrError, setVrError] = useState('');
  const [previewVoId, setPreviewVoId] = useState<string | null>(null);
  const [newCatalogItemName, setNewCatalogItemName] = useState('');
  const [customCatalogItems, setCustomCatalogItems] = useState<{id:string;name:string}[]>([]);
  const [quantityError, setQuantityError] = useState('');
  const [unitCostError, setUnitCostError] = useState('');
  const [poError, setPoError] = useState('');
  const [vendorErrors, setVendorErrors] = useState({
  vendor: '',
  quantity: '',
  unitCost: '',
  cognizantPo: '',
  warehouseAddress: '',
});
  const navigate = useNavigate();

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

  // Clear previous validation errors
  setVrError('');
  setQuantityError('');
  setUnitCostError('');

  setVrModelCategory(cat);
  setVrCurrentGen('');
  setVrSku1('');
  setVrCatalogItemId('');


  const first = catalog.find(
    (c) => c.modelCategory === cat
  );

  if (first) {
    setVrCurrentGen(first.currentGenModel);
    setVrSku1(first.currentGenSku);
    setVrCatalogItemId(first.id);

    const newUnitCost = first.vendorMappings[0]?.unitCost ?? 0;

    setVrUnitCost(newUnitCost);

    // Validate the automatically updated unit cost
    if (newUnitCost <= 0) {
      setUnitCostError('Unit Cost must be greater than 0');
    } else if (newUnitCost > 10000) {
      setUnitCostError('Unit Cost cannot exceed 10000 USD');
    } else {
      setUnitCostError('');
    }
  }
}
function onCurrentGenChange(val: string) {
  setVrError('');
  setUnitCostError('');

  setVrCurrentGen(val);

  const match = filteredCatalogItems.find(
    (c) => c.currentGenModel === val
  );

  setVrSku1(match?.currentGenSku ?? '');
  setVrCatalogItemId(match?.id ?? '');

  if (match) {
    const vm = vrVendor
      ? match.vendorMappings.find(
          (m) => m.vendor === vrVendor
        )
      : match.vendorMappings[0];

    const newUnitCost = vm?.unitCost ?? 0;

    setVrUnitCost(newUnitCost);

    if (newUnitCost <= 0) {
      setUnitCostError('Unit Cost must be greater than 0');
    } else if (newUnitCost > 10000) {
      setUnitCostError('Unit Cost cannot exceed 10000 USD');
    } else {
      setUnitCostError('');
    }
  }
}
  function onCatalogItemChange(id: string) {
  setVrError('');
  setUnitCostError('');

  setVrCatalogItemId(id);

  const item = catalog.find((c) => c.id === id);

  if (!item) {
    return;
  }

  setVrCurrentGen(item.currentGenModel);
  setVrSku1(item.currentGenSku);
  setVrModelCategory(item.modelCategory);

  const vm = vrVendor
    ? item.vendorMappings.find(
        (m) => m.vendor === vrVendor
      )
    : item.vendorMappings[0];

  if (vm) {
    setVrVendor(vm.vendor);
    setVrUnitCost(vm.unitCost);

    if (vm.unitCost <= 0) {
      setUnitCostError(
        'Unit Cost must be greater than 0'
      );
    } else if (vm.unitCost > 10000) {
      setUnitCostError(
        'Unit Cost cannot exceed 10000 USD'
      );
    } else {
      setUnitCostError('');
    }
  }
}
 function onVendorChange(v: VendorName) {
  setVrError('');
  setVrVendor(v);

  const item = selectedCatalogItem;

  if (item) {
    const vm = item.vendorMappings.find(
      (m) => m.vendor === v
    );

    if (vm) {
      setVrUnitCost(vm.unitCost);
    }
  }
}

  const approvedPRs = useMemo(() => purchaseRequisitions.filter(pr => pr.status === 'APPROVED'), [purchaseRequisitions]);

function submitVendorRequest() {
  // ==========================================
  // 1. MANDATORY FIELD VALIDATION
  // ==========================================

  if (
    !vrModelCategory ||
    !vrCurrentGen ||
    !vrSku1 ||
    !vrVendor ||
    !vrQuantity ||
    Number(vrQuantity) <= 0 ||
    !vrUnitCost ||
    Number(vrUnitCost) <= 0 ||
    !vrCatalogItemId ||
    !vrCognizantPo.trim() ||
    !vrChannel ||
    !vrDestination ||
    !vrWarehouseAddress.trim()
  ) {
    setVrError('Please fill in all mandatory fields.');
    return;
  }

  // ==========================================
  // 2. EXISTING PO ERROR
  // ==========================================

  if (poError) {
    setVrError('Please enter a valid PO Number.');
    return;
  }

  // ==========================================
  // 3. QUANTITY VALIDATION
  // ==========================================

  if (Number(vrQuantity) > 500) {
    setVrError('Quantity cannot exceed 500.');
    return;
  }

  if (Number(vrQuantity) <= 0) {
    setVrError('Quantity must be greater than 0.');
    return;
  }

  // ==========================================
  // 4. UNIT COST VALIDATION
  // ==========================================

  if (Number(vrUnitCost) > 10000) {
    setVrError('Unit Cost cannot exceed 10000 USD.');
    return;
  }

  if (Number(vrUnitCost) <= 0) {
    setVrError('Unit Cost must be greater than 0.');
    return;
  }

  // ==========================================
  // 5. ADDRESS VALIDATION
  // ==========================================

  if (
    vrDestination === 'Client Office' &&
    (
      vrWarehouseAddress.trim().length < 20 ||
      vrWarehouseAddress.trim().length > 500
    )
  ) {
    setVrError(
      'Client Office Address must be between 20 and 500 characters.'
    );
    return;
  }

  // ==========================================
  // 6. PO VALIDATION
  // ==========================================

  if (!/^[A-Za-z0-9-]+$/.test(vrCognizantPo)) {
    setVrError(
      'PO Number can contain only letters, numbers, and hyphens.'
    );
    return;
  }

  // Everything is valid, remove previous error
  setVrError('');
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

          console.log("Coming till here  =b4 marking converted===============>")

    if (pr) markPrConverted(pr.id);
    setPreviewVoId(vo.id);
    setVrModelCategory(''); setVrCurrentGen(''); setVrSku1(''); setVrVendor(''); setVrQuantity(1); setVrUnitCost(0); setVrCatalogItemId(''); setVrCognizantPo(''); setVrChannel('Webshop Portal' as any); setVrDestination('Cognizant Warehouse'); setVrWarehouseAddress(''); setVrError('');
     
      console.log("Coming till here  ================>")

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
      </div>

      <div className="p-5 space-y-5 a360-card">
        <h2 className="text-sm font-semibold text-slate-800">Vendor Request Form</h2>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Model &amp; Generation</p>
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
          <div className="p-4 space-y-3 text-xs border rounded-lg border-brand-100 bg-brand-50">
            <p className="font-semibold tracking-wide uppercase text-brand-700">Catalog — {selectedCatalogItem.modelCategory} <span className="ml-2 font-normal normal-case text-brand-500">{selectedCatalogItem.eolTimeline}</span></p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div><p className="font-medium text-slate-400">Current Gen Config</p><p className="text-slate-700">{selectedCatalogItem.currentGenConfigDetails}</p></div>
              <div><p className="font-medium text-slate-400">New Gen Config</p><p className="text-slate-700">{selectedCatalogItem.newGenConfigDetails}</p></div>
              <div><p className="font-medium text-slate-400">Current Gen SKU</p><code className="text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedCatalogItem.currentGenSku}</code></div>
              <div><p className="font-medium text-slate-400">New Gen SKU</p><code className="text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{selectedCatalogItem.newGenSku}</code></div>
            </div>
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Vendor &amp; Quantity</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="a360-label">Vendor</label>
              <select className="a360-input" value={vrVendor} onChange={e => onVendorChange(e.target.value as VendorName)} required>
                <option value="" disabled>Select vendor...</option>
                {vendorOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
  <label className="a360-label">
    Quantity
  </label>

  <input
    className={`a360-input ${
      quantityError ? 'border-red-500 focus:border-red-500' : ''
    }`}
    type="number"
    min="1"
    max="500"
    value={vrQuantity}
    onChange={(e) => {
      // Clear general form error when user edits quantity
      setVrError('');

      const value = e.target.value;

      // Allow user to temporarily clear the field
      if (value === '') {
        setVrQuantity('');
        setQuantityError('');
        return;
      }

      const numValue = Number(value);

      // IMPORTANT:
      // Update the input value even when it is invalid.
      // This prevents an old valid value from being shown
      // together with a new validation error.
      setVrQuantity(numValue);

      // Validate minimum
      if (numValue <= 0) {
        setQuantityError(
          'Quantity must be greater than 0'
        );
        return;
      }

      // Validate maximum
      if (numValue > 500) {
        setQuantityError(
          'Quantity cannot exceed 500'
        );
        return;
      }

      // Valid value, remove previous error immediately
      setQuantityError('');
    }}
    required
  />

  {quantityError && (
    <p className="mt-1 text-sm text-red-600">
      {quantityError}
    </p>
  )}
</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
  <label className="a360-label">
    Unit Cost (USD)
  </label>

  <input
    className={`a360-input ${
      unitCostError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : ''
    }`}
    type="number"
    min="1"
    max="10000"
    step="0.01"
    value={vrUnitCost}
    onChange={(e) => {
      // Clear general form error
      setVrError('');

      const value = e.target.value;

      // Allow the field to be temporarily empty
      if (value === '') {
        setVrUnitCost('');
        setUnitCostError('');
        return;
      }

      const numValue = Number(value);

      // IMPORTANT:
      // Always update the state first
      setVrUnitCost(numValue);

      // Minimum validation
      if (numValue <= 0) {
        setUnitCostError(
          'Unit Cost must be greater than 0'
        );
        return;
      }

      // Maximum validation
      if (numValue > 10000) {
        setUnitCostError(
          'Unit Cost cannot exceed 10000 USD'
        );
        return;
      }

      // Valid value, remove old error immediately
      setUnitCostError('');
    }}
    required
  />

  {unitCostError && (
    <p className="mt-1 text-sm text-red-600">
      {unitCostError}
    </p>
  )}
</div>
            <div>
              <label className="a360-label">Total Cost</label>
              <div className="flex items-center justify-between font-semibold cursor-not-allowed a360-input bg-slate-50 text-slate-800">
                <span className="text-xs font-normal text-slate-400">USD</span>
                <span>{totalCost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="a360-label">Catalog Item <span className="font-normal text-slate-400">(from catalog)</span></label>
            <div className="flex gap-2">
              <select className="flex-1 a360-input" value={vrCatalogItemId} onChange={e => onCatalogItemChange(e.target.value)}>
                <option value="">Select from catalog...</option>
                {filteredCatalogItems.map(item => <option key={item.id} value={item.id}>{item.currentGenModel} — {item.currentGenSku}</option>)}
                {customCatalogItems.map(item => <option key={item.id} value={item.id}>{item.name} (Custom)</option>)}
              </select>
              <input type="text" className="w-64 a360-input" value={newCatalogItemName} onChange={e => setNewCatalogItemName(e.target.value)} placeholder="Custom catalog item..." />
              <button type="button" className="px-4 a360-btn-primary" onClick={addCustomCatalogItem}>+</button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">PO &amp; Channel</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Cognizant PO</label>
<input
  className="a360-input"
  type="text"
  value={vrCognizantPo}
onChange={(e) => {
  setVrError('');

  const value = e.target.value;

  if (/[^A-Za-z0-9-]/.test(value)) {
    setPoError('Special characters are not allowed');
  } else {
    setPoError('');
  }

  setVrCognizantPo(value);
}}
  placeholder="e.g. CGZ-PO-2026-00200"
  required
/>
{poError && (
  <p className="mt-1 text-sm text-red-600">
    {poError}
  </p>
)}
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
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Destination</p>
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
              <textarea
  className="a360-input"
  rows={4}
  value={vrWarehouseAddress}
  minLength={vrDestination === 'Client Office' ? 20 : undefined}
  maxLength={500}
  onChange={(e) => setVrWarehouseAddress(e.target.value)}
  placeholder={
    vrDestination === 'Cognizant Warehouse'
      ? 'Enter Cognizant warehouse address...'
      : 'Enter client office delivery address (20-500 characters)...'
  }
/></div>
          </div>
        </div>

        {vrError && <p className="text-sm text-rose-600">{vrError}</p>}
        <div className="pt-1 border-t border-slate-100">
          <button type="button" onClick={submitVendorRequest} className="a360-btn-primary">+ Add Vendor Request</button>
        </div>
      </div>

<VendorRequestPreview voId={previewVoId} onClose={() => setPreviewVoId(null)} onConfirm={(voId) => {  submitVendorOrder(voId);  setPreviewVoId(null); navigate('/procurement/orders');}} />
  </div>
  );
}

// type alias to satisfy TypeScript
type VendorOrderCreate = { channel: 'Webshop Portal' | 'Integrated Procurement API' | 'EDI' };
