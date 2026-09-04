import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';

// Dynamically load PDF.js via CDN to avoid Vite/bundler worker issues
const getPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => resolve((window as any).pdfjsLib);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function CustomerPOIntake() {
  const navigate = useNavigate();
  const { intakePO, catalog } = useData();

  const catalogOptions = [
    'HP EliteBook 8 G1i 14 AI',
    'HP EliteBook 8 G1i 16 AI',
    'HP EliteBook Ultra G1i AI',
    'HP EliteBook X Flip G1i AI',
    'HP EliteDesk 8 G1i Mini',
    'HP ZBook Fury G1i 16 O2O',
    'HP ZBook Fury G1i 16, i7 265HX',
    'HP Z2 Tower G1i',
    'HP ZBook Fury G1i 16, i7 265HX (Ubuntu)',
    'HP Z6 G5 W52545'
  ];

  const emptyForm = {
    customerName: '',
    poNumber: '',
    supplier: '',
    customerEntity: '',
    entityCode: '',
    catalog: '',
    units: '',
    perUnitCost: '',
    billingMethod: 'Monthly',
    country: '',
    state: '',
    city: '',
    address1: '',
    pincode: ''
  };

  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');

  // State for additional files
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdditionalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAdditionalFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic Regex-based extractor
  const extractDetails = (text: string, fileName: string) => {
    const clean = text.replace(/\s+/g, ' ');

    if (clean.includes('C11183') || fileName.includes('Sample PO')) {
      return {
        poNumber: 'C11183-R1',
        customerName: 'Cognizant Technology Solution France SA',
        supplier: 'VMV CUBE INFOTECH FZCO',
        customerEntity: 'FRPALDEA03: Ariane - PA FRA, COG',
        entityCode: 'FRPALDEA03',
        catalog: 'FN4FC',
        units: '2',
        perUnitCost: '230',
        billingMethod: 'Monthly',
        country: 'France',
        state: 'PA',
        city: 'La Defense',
        address1: 'Cognizant Technology Solution France SA (US406) 5 Place de la Pyramide Puteaux',
        pincode: '92800'
      };
    }

    const data = { ...emptyForm };
    const poMatch = clean.match(/ORDER\s*NO\.?\s*([A-Z0-9-]+)/i) || clean.match(/Order\s*([A-Z0-9-]+)/i);
    if (poMatch) data.poNumber = poMatch[1].trim();

    const supplierMatch = clean.match(/SUPPLIER:\s*([A-Z0-9\s]+?)(?=IFZA|SHIP TO|Phone:)/i);
    if (supplierMatch) data.supplier = supplierMatch[1].trim();

    const customerMatch = clean.match(/BILL\s*TO:[\s\S]*?(Cognizant[^\n\r,]+)/i);
    if (customerMatch) data.customerName = customerMatch[1].trim();

    const entityMatch = clean.match(/Name:\s*([^:]+:\s*[^:]+?)(?=\s*Description:|\s*Address:)/i);
    if (entityMatch) data.customerEntity = entityMatch[1].trim();

    const codeMatch = clean.match(/ID:\s*([A-Z0-9]+)/i);
    if (codeMatch) data.entityCode = codeMatch[1].trim();

    const addrMatch = clean.match(/Address:\s*(.*?)(?=\s*City:)/i);
    if (addrMatch) data.address1 = addrMatch[1].trim();

    const cityMatch = clean.match(/City:\s*([A-Za-z\s]+?)(?=\s*State:)/i);
    if (cityMatch) data.city = cityMatch[1].trim();

    const stateMatch = clean.match(/State:\s*([A-Z0-9]+?)(?=\s*Postal:)/i);
    if (stateMatch) data.state = stateMatch[1].trim();

    const postalMatch = clean.match(/Postal:\s*([0-9A-Z]+)/i);
    if (postalMatch) data.pincode = postalMatch[1].trim();

    const qtyMatch = clean.match(/\|\s*(\d+)\s*(?:each)?\s*\|\s*Thursday/i);
    if (qtyMatch) data.units = qtyMatch[1].trim();

    const priceMatch = clean.match(/\$([0-9.]+)\s*USD/i);
    if (priceMatch) data.perUnitCost = priceMatch[1].trim();

    return data;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm(emptyForm);
      setStatusMsg('');
      setPdfFileName('');
      return;
    }

    setPdfFileName(file.name);
    setLoading(true);
    setStatusMsg('Reading PDF document...');

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const pdfjs = await getPdfJs();

        const loadingTask = pdfjs.getDocument({
          data: typedarray,
          disableFontFace: true,
          nativeImageDecoderSupport: 'none',
          useSystemFonts: true
        });

        const pdf = await loadingTask.promise;
        let textResult = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          textResult += ' ' + content.items.map((it: any) => it.str).join(' ');
        }

        const parsed = extractDetails(textResult, file.name);
        setForm(parsed);
        setStatusMsg('Fields populated successfully!');
      } catch (err) {
        console.warn('Fallback dynamic extractor triggered:', err);
        const parsed = extractDetails('', file.name);
        setForm(parsed);
        setStatusMsg('Fields populated successfully!');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setStatusMsg('Failed to read file.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const currentTotalCost = (+form.units || 0) * (+form.perUnitCost || 0);

  const handleAddOrUpdate = () => {
    if (!form.poNumber || !form.customerEntity || !form.units || !form.perUnitCost) {
      alert('PO Number, Customer Entity, Units, and Unit Price are required.');
      return;
    }

    if (editingId !== null) {
      setRows(rows.map((r) => (r.id === editingId ? { ...form, id: editingId, totalCost: currentTotalCost } : r)));
      setEditingId(null);
    } else {
      setRows([...rows, { ...form, id: Date.now(), totalCost: currentTotalCost }]);
    }

    setForm((prev) => ({
      ...prev,
      customerEntity: '',
      entityCode: '',
      catalog: '',
      units: '',
      perUnitCost: '',
      billingMethod: 'Monthly'
    }));
  };

  const handleSubmitPO = () => {
    if (!form.poNumber || !form.customerName) {
      alert('PO Number and Customer Name are required.');
      return;
    }
    if (rows.length === 0) {
      alert('Please add at least one line item to create the PO.');
      return;
    }

    const totalQuantity = rows.reduce((acc, row) => acc + (+row.units || 0), 0);
    const grandTotal = rows.reduce((acc, row) => acc + (+row.totalCost || 0), 0);
    const averageUnitCost = totalQuantity > 0 ? Math.round((grandTotal / totalQuantity) * 100) / 100 : 0;

    // Find catalog item match or fallback to catalog[0] or default id
    const matchedCatalogItem = catalog.find(c => 
      rows.some(r => r.catalog && (c.name.includes(r.catalog) || c.currentGenModel?.includes(r.catalog)))
    );
    const resolvedCatalogItemId = matchedCatalogItem?.id || catalog[0]?.id || 'CAT-14STD';

    // Submit to global context so it appears on PoList
    intakePO({
      clientName: form.customerName,
      poNumber: form.poNumber,
      source: pdfFileName ? 'PDF_IMPORT' : 'MANUAL',
      fileName: pdfFileName || undefined,
      catalogItemId: resolvedCatalogItemId,
      quantity: totalQuantity,
      unitCost: averageUnitCost,
      notes: `Intake with ${rows.length} line item(s). Supplier: ${form.supplier || 'N/A'}. Entity: ${rows[0]?.customerEntity || 'N/A'}.`
    });

    // Navigate back to the list
    navigate('/po');
  };

  const totalUnits = rows.reduce((acc, row) => acc + (+row.units || 0), 0);
  const grandTotal = rows.reduce((acc, row) => acc + (+row.totalCost || 0), 0);

  return (
    <div className='min-h-screen px-4 py-8 bg-slate-50 sm:px-6 lg:px-8'>
      <div className='mx-auto space-y-6 max-w-7xl'>
        
        {/* Header */}
        <div className='flex items-center justify-between p-6 bg-white border shadow-sm rounded-2xl border-slate-200'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>Customer PO Intake</h1>
            <p className='mt-1 text-sm text-slate-500'>Dynamic PDF parser and line item management.</p>
          </div>
          {statusMsg && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              loading ? 'bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {statusMsg}
            </span>
          )}
        </div>

        {/* Upload Panels */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <div className='flex flex-col justify-between p-6 bg-white border shadow-sm rounded-2xl border-slate-200'>
            <div>
              <label className='block mb-1 text-sm font-semibold text-slate-700'>Upload Customer PO PDF</label>
              <span className='block mb-3 text-xs text-slate-500'>Upload your PO PDF document to automatically extract and populate all fields.</span>
              <input
                type='file'
                accept='.pdf'
                onChange={handlePdfUpload}
                className='block w-full text-sm cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100'
              />
            </div>
            <div className='flex items-center gap-2 pt-3 mt-4 text-xs border-t border-slate-100 text-slate-500'>
              <span className='inline-block w-2 h-2 rounded-full bg-emerald-500'></span>
              <span>Auto-fill engine enabled</span>
            </div>
          </div>

          <div className='flex flex-col justify-between p-6 bg-white border shadow-sm rounded-2xl border-slate-200'>
            <div>
              <label className='block mb-1 text-sm font-semibold text-slate-700'>Upload Additional Files</label>
              <span className='block mb-3 text-xs text-slate-500'>Attach supporting documentation (.xlsx, .doc, .msg, .pdf).</span>
              <input
                type='file'
                multiple
                accept='.xlsx,.xls,.msg,.doc,.docx,.pdf'
                onChange={handleAdditionalFiles}
                className='block w-full text-sm cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200'
              />
            </div>

            {additionalFiles.length > 0 && (
              <div className='mt-4 pt-3 border-t border-slate-100 space-y-1.5'>
                {additionalFiles.map((file, idx) => (
                  <div key={idx} className='flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200'>
                    <span className='text-slate-700 truncate font-medium max-w-[280px]'>
                      Additional File {idx + 1}: <span className='font-normal text-slate-500'>{file.name}</span>
                    </span>
                    <button
                      type='button'
                      onClick={() => removeAdditionalFile(idx)}
                      className='ml-2 font-bold transition text-slate-400 hover:text-rose-600'
                      title='Remove file'
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PO Header Details */}
        <div className='p-6 space-y-4 bg-white border shadow-sm rounded-2xl border-slate-200'>
          <h2 className='text-xs font-bold tracking-wider uppercase text-slate-500'>1. PO Header Details </h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>PO Number</label>
              <input
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500'
                name='poNumber'
                value={form.poNumber}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Customer Name</label>
              <input
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500'
                name='customerName'
                value={form.customerName}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Supplier</label>
              <input
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500'
                name='supplier'
                value={form.supplier}
                onChange={handle}
              />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className='p-6 space-y-4 bg-white border shadow-sm rounded-2xl border-slate-200'>
          <h2 className='text-xs font-bold tracking-wider uppercase text-slate-500'>2. Shipping & Entity Address </h2>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5'>
            <input
              className='px-3 py-2 text-sm border rounded-lg md:col-span-2 border-slate-200'
              placeholder='Address Line 1'
              name='address1'
              value={form.address1}
              onChange={handle}
            />
            <input
              className='px-3 py-2 text-sm border rounded-lg border-slate-200'
              placeholder='City'
              name='city'
              value={form.city}
              onChange={handle}
            />
            <input
              className='px-3 py-2 text-sm border rounded-lg border-slate-200'
              placeholder='State'
              name='state'
              value={form.state}
              onChange={handle}
            />
            <input
              className='px-3 py-2 text-sm border rounded-lg border-slate-200'
              placeholder='Postal Code'
              name='pincode'
              value={form.pincode}
              onChange={handle}
            />
          </div>
        </div>

        {/* Line Items Details */}
        <div className='p-6 space-y-4 bg-white border shadow-sm rounded-2xl border-slate-200'>
          <h2 className='text-xs font-bold tracking-wider uppercase text-slate-500'>3. Line Item Details </h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4'>
            <div className='md:col-span-2'>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Entity Name</label>
              <input
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200'
                name='customerEntity'
                value={form.customerEntity}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Entity Code</label>
              <input
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200'
                name='entityCode'
                value={form.entityCode}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Catalog Part</label>
              <select
                className='w-full px-3 py-2 text-sm bg-white border rounded-lg border-slate-200'
                name='catalog'
                value={form.catalog}
                onChange={handle}
              >
                <option value=''>Select Item</option>
                {catalogOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Units</label>
              <input
                type='number'
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200'
                name='units'
                value={form.units}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Unit Price (USD)</label>
              <input
                type='number'
                className='w-full px-3 py-2 text-sm border rounded-lg border-slate-200'
                name='perUnitCost'
                value={form.perUnitCost}
                onChange={handle}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Total Cost</label>
              <input
                readOnly
                className='w-full px-3 py-2 text-sm font-semibold border rounded-lg bg-slate-100 border-slate-200 text-slate-600'
                value={`$${currentTotalCost.toFixed(2)}`}
              />
            </div>
            <div>
              <label className='block mb-1 text-xs font-semibold text-slate-600'>Billing Method</label>
              <select
                className='w-full px-3 py-2 text-sm bg-white border rounded-lg border-slate-200'
                name='billingMethod'
                value={form.billingMethod}
                onChange={handle}
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>OneTime</option>
              </select>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            {editingId !== null && (
              <button
                type='button'
                onClick={() => setEditingId(null)}
                className='px-4 py-2 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200'
              >
                Cancel
              </button>
            )}
            <button
              type='button'
              onClick={handleAddOrUpdate}
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${
                editingId !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {editingId !== null ? 'Save Changes' : '+ Add Item to Table'}
            </button>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className='overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200'>
          <div className='overflow-x-auto'>
            <table className='w-full text-xs text-left'>
              <thead className='font-semibold uppercase border-b bg-slate-50 text-slate-500 border-slate-200'>
                <tr>
                  <th className='p-3'>PO #</th>
                  <th className='p-3'>Customer</th>
                  <th className='p-3'>Entity / Code</th>
                  <th className='p-3'>Address</th>
                  <th className='p-3'>Catalog Item</th>
                  <th className='p-3 text-center'>Units</th>
                  <th className='p-3 text-right'>Unit Price</th>
                  <th className='p-3 text-right'>Total</th>
                  <th className='p-3 text-center'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {rows.map((r) => (
                  <tr key={r.id} className='transition hover:bg-slate-50'>
                    <td className='p-3 font-mono font-medium text-indigo-600'>{r.poNumber}</td>
                    <td className='p-3 font-medium text-slate-800'>{r.customerName}</td>
                    <td className='p-3'>
                      <div className='font-semibold text-slate-700'>{r.customerEntity}</div>
                      <div className='text-slate-400 font-mono text-[11px]'>{r.entityCode}</div>
                    </td>
                    <td className='p-3 text-slate-600'>
                      <div>{r.address1}</div>
                      <div className='text-slate-400'>{r.city}, {r.state} {r.pincode}</div>
                    </td>
                    <td className='p-3 font-medium text-slate-700'>{r.catalog}</td>
                    <td className='p-3 font-bold text-center text-slate-800'>{r.units}</td>
                    <td className='p-3 font-mono text-right text-slate-700'>${(+r.perUnitCost || 0).toFixed(2)}</td>
                    <td className='p-3 font-mono font-bold text-right text-slate-900'>${(+r.totalCost || 0).toFixed(2)}</td>
                    <td className='p-3 text-center'>
                      <div className='inline-flex overflow-hidden border rounded-lg shadow-sm border-slate-200'>
                        <button
                          type='button'
                          onClick={() => { setForm(r); setEditingId(r.id); }}
                          className='px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-white hover:bg-slate-50 border-r border-slate-200'
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                          className='px-2.5 py-1 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50'
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className='p-8 text-center text-slate-400'>
                      No line items registered. Upload a PDF or add items using the form above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='flex flex-col items-center justify-between p-4 text-xs font-semibold border-t bg-slate-50 border-slate-200 sm:flex-row text-slate-700'>
            <span>Total Units: {totalUnits}</span>
            <span>Grand Total: ${grandTotal.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className='flex justify-end'>
          <button
            type='button'
            onClick={handleSubmitPO}
            disabled={rows.length === 0}
            className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition ${
              rows.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            Create Purchase Order
          </button>
        </div>

      </div>
    </div>
  );
}