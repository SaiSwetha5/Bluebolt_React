import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import PdfViewer from '../../components/ui/PdfViewer';
import type { CatalogItem, PoSource } from '../../types/models';
import { COUNTRY_NAMES, getStates, getCities, guessLocationFromText } from '../../utils/geoData';

type PdfStep = 'upload' | 'extracting' | 'review';

interface LineItem {
  partNumber: string;
  description: string;
  catalogItemId: string;
  quantity: number;
  unitCost: number;
}

interface PoHeader {
  clientName: string;
  poNumber: string;
  supplier: string;
  shipment: string;
  country: string;
  state: string;
  city: string;
  notes: string;
}

const EMPTY_HEADER: PoHeader = { clientName: '', poNumber: '', supplier: '', shipment: '', country: '', state: '', city: '', notes: '' };
const EMPTY_LINE_ITEM: LineItem = { partNumber: '', description: '', catalogItemId: '', quantity: 1, unitCost: 0 };

// Browser-safe CDN loader to prevent worker/bundler freezes in Vite
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

/**
 * Extracts text from the PDF, preserving row structure by grouping text items
 * that share (roughly) the same vertical position on the page. This lets the
 * line-item table and address blocks be parsed by position instead of by
 * matching fixed sample-PO strings.
 */
async function extractPdfLines(arrayBuffer: ArrayBuffer): Promise<{ fullText: string; lines: string[] }> {
  const pdfjsLib = await getPdfJs();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    nativeImageDecoderSupport: 'none',
    useSystemFonts: true
  }).promise;

  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: { str: string; x: number; y: number }[] = content.items.map((it: any) => ({
      str: it.str ?? '',
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0
    })).filter((it: any) => it.str.trim().length > 0);

    // Group items into visual rows: items whose y-position is within a small
    // tolerance belong to the same line on the page.
    const rows: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      let row = rows.find(r => Math.abs(r.y - item.y) < 3);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    }
    rows.sort((a, b) => b.y - a.y); // top of page first
    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      allLines.push(row.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim());
    }
  }

  return { fullText: allLines.join('\n'), lines: allLines.filter(Boolean) };
}

function bestCatalogMatch(primary: string, fullText: string, catalog: CatalogItem[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const p = norm(primary);
  const f = norm(fullText);
  let bestId = '', bestScore = 0;

  for (const item of catalog) {
    const haystack = [
      item.name,
      item.shopDescription,
      item.currentGenModel,
      item.newGenModel,
      item.currentGenSku,
      item.newGenSku,
      item.longDescription,
      item.modelCategory,
      item.cpu,
      ...item.vendorMappings.map(v => `${v.vendor} ${v.currentGenModel} ${v.currentGenSku} ${v.newGenModel}`)
    ].map(norm).join(' | ');

    const tokens = new Set(haystack.split(/[\s|]+/).filter(w => w.length > 2));
    let score = 0;
    for (const t2 of tokens) {
      if (p.includes(t2)) score += 3;
      else if (f.includes(t2)) score += 1;
    }
    for (const brand of ['hp', 'dell', 'lenovo']) {
      if (haystack.includes(brand) && (p.includes(brand) || f.includes(brand))) score += 2;
    }
    const specPat = /\b(\d+)\s?(gb|tb|ghz|inch|"|core)\b/gi;
    const hSpecs = [...haystack.matchAll(specPat)].map(m => `${m[1]}${m[2]}`.toLowerCase());
    const pSpecs = [...(p + ' ' + f).matchAll(specPat)].map(m => `${m[1]}${m[2]}`.toLowerCase());
    for (const sp of hSpecs) {
      if (pSpecs.includes(sp)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = item.id;
    }
  }
  return bestScore >= 3 ? bestId : '';
}

/** Pulls PO-level header fields (client, PO#, supplier, shipment, location) out of the parsed lines. */
function parseHeaderFields(lines: string[], fullText: string): Partial<PoHeader> {
  const header: Partial<PoHeader> = {};

  const poMatch = fullText.match(/(?:P\.?O\.?\s*(?:No\.?|Number|#)?|ORDER\s*NO\.?|Order\s*Number)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i);
  if (poMatch) header.poNumber = poMatch[1].trim();

  const custMatch = fullText.match(/(?:BILL\s*TO|Customer|Client)\s*[:\-]?\s*\n?\s*([A-Z][A-Za-z0-9&.,'\- ]{3,60})/i);
  if (custMatch) header.clientName = custMatch[1].split(/\n|,\s*(?:Attn|Address)/i)[0].trim();

  const suppMatch = fullText.match(/(?:SUPPLIER|VENDOR|SOLD\s*BY)\s*[:\-]?\s*\n?\s*([A-Z0-9][A-Za-z0-9&.,'\- ]{3,60})/i);
  if (suppMatch) header.supplier = suppMatch[1].split(/\n|,\s*(?:Attn|Address)/i)[0].trim();

  const shipMatch = fullText.match(/(?:SHIP\s*VIA|SHIPPING\s*METHOD|SHIPMENT|FREIGHT\s*TERMS?)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9 \-]{2,40})/i);
  if (shipMatch) header.shipment = shipMatch[1].trim();

  const loc = guessLocationFromText(fullText);
  if (loc.country) header.country = loc.country;
  if (loc.state) header.state = loc.state;
  if (loc.city) header.city = loc.city;

  return header;
}

/** Detects one or more line-item rows (part/sku, description, qty, unit cost) from the parsed rows. */
function parseLineItems(lines: string[]): Omit<LineItem, 'catalogItemId'>[] {
  const items: Omit<LineItem, 'catalogItemId'>[] = [];

  // Row shape: <SKU/Part> <description...> <qty> <unit price>
  const rowPattern = /^([A-Z0-9][A-Z0-9\-\.\/]{2,19})\s+(.+?)\s+(\d{1,5})\s*(?:x|each|units?|pcs?)?\s*[@\-]?\s*\$?\s*([\d,]+\.\d{2})\s*(?:USD)?$/i;
  // Pipe-delimited table row: | SKU | description | qty | price |
  const pipePattern = /\|?\s*([A-Z0-9][A-Z0-9\-\.\/]{2,19})\s*\|\s*(.+?)\s*\|\s*(\d{1,5})\s*(?:each)?\s*\|\s*\$?\s*([\d,]+\.\d{2})/i;

  for (const line of lines) {
    const m = line.match(rowPattern) || line.match(pipePattern);
    if (!m) continue;
    const [, partNumber, description, qty, price] = m;
    items.push({
      partNumber: partNumber.trim(),
      description: description.trim(),
      quantity: parseInt(qty, 10) || 1,
      unitCost: parseFloat(price.replace(/,/g, '')) || 0
    });
  }

  return items;
}

export default function PoImport() {
  const { intakePO, catalog } = useData();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PoSource>('PDF_IMPORT');

  // API tab
  const [clientName, setClientName] = useState('Meridian Financial Group');
  const [poNumber, setPoNumber] = useState('');
  const [catalogItemId, setCatalogItemId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [unitCost, setUnitCost] = useState(1540);
  const [notes, setNotes] = useState('');

  // PDF tab
  const [fileName, setFileName] = useState<string | undefined>();
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>();
  const [pdfStep, setPdfStep] = useState<PdfStep>('upload');
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [pdfFullText, setPdfFullText] = useState('');

  // Editable header (shared across all line items) + dynamic line-item import table
  const [header, setHeader] = useState<PoHeader>(EMPTY_HEADER);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const activeCatalog = catalog.filter(c => c.active);

  const catalogGroups = (() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of activeCatalog) {
      const key = item.modelCategory || item.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  })();

  function onCatalogChange(id: string) {
    setCatalogItemId(id);
    const item = activeCatalog.find(c => c.id === id);
    if (item) setUnitCost(item.vendorMappings[0]?.unitCost ?? item.clientListPrice);
  }

  const stateOptions = header.country ? getStates(header.country) : [];
  const cityOptions = header.country && header.state ? getCities(header.country, header.state) : [];

  function updateHeader(patch: Partial<PoHeader>) {
    setHeader(h => ({ ...h, ...patch }));
  }

  function onCountryChange(country: string) {
    updateHeader({ country, state: '', city: '' });
  }

  function onStateChange(state: string) {
    updateHeader({ state, city: '' });
  }

  function updateLineItem(index: number, patch: Partial<LineItem>) {
    setLineItems(list => list.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  // Fixes the "Part Number not binding" issue: editing the part number re-runs
  // catalog matching so the selected catalog item (and its cost) always tracks
  // what is actually typed/extracted, instead of being silently ignored.
  function onPartNumberChange(index: number, value: string) {
    const matchedId = bestCatalogMatch(value, pdfFullText, activeCatalog);
    setLineItems(list => list.map((li, i) => (i === index ? {
      ...li,
      partNumber: value,
      catalogItemId: matchedId || li.catalogItemId
    } : li)));
  }

  function onLineCatalogChange(index: number, id: string) {
    const item = activeCatalog.find(c => c.id === id);
    setLineItems(list => list.map((li, i) => (i === index ? {
      ...li,
      catalogItemId: id,
      partNumber: item?.currentGenSku || li.partNumber,
      unitCost: li.unitCost || item?.vendorMappings[0]?.unitCost || item?.clientListPrice || 0
    } : li)));
  }

  function deleteLineItem(index: number) {
    setLineItems(list => list.filter((_, i) => i !== index));
    setSelectedRow(sel => (sel === index ? null : sel !== null && sel > index ? sel - 1 : sel));
  }

  function selectRow(index: number) {
    setSelectedRow(sel => (sel === index ? null : index));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPdfError('');
    setIsExtracting(true);
    setPdfStep('extracting');
    setSelectedRow(null);

    try {
      const [arrayBuffer, dataUrl] = await Promise.all([
        file.arrayBuffer(),
        new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        })
      ]);
      setFileDataUrl(dataUrl);

      let fullText = '', lines: string[] = [];
      try {
        const extracted = await extractPdfLines(arrayBuffer);
        fullText = extracted.fullText;
        lines = extracted.lines;
      } catch (err) {
        console.warn('PDF text extraction failed:', err);
      }
      setPdfFullText(fullText);

      const headerFields = parseHeaderFields(lines, fullText);
      const rawItems = parseLineItems(lines);

      const items: LineItem[] = (rawItems.length ? rawItems : [EMPTY_LINE_ITEM]).map(item => ({
        ...item,
        catalogItemId: bestCatalogMatch(`${item.partNumber} ${item.description}`, fullText, activeCatalog) || ''
      }));

      setHeader({
        clientName: headerFields.clientName || '',
        poNumber: headerFields.poNumber || '',
        supplier: headerFields.supplier || '',
        shipment: headerFields.shipment || '',
        country: headerFields.country || '',
        state: headerFields.state || '',
        city: headerFields.city || '',
        notes: `Imported from PDF: ${file.name}`
      });
      setLineItems(items);
      setPdfStep('review');

      if (!rawItems.length) {
        setPdfError('Could not automatically detect line items in this PDF — please enter them manually below.');
      }
    } catch (err) {
      setPdfError('Failed to extract data from PDF. Manual review required.');
      setLineItems([EMPTY_LINE_ITEM]);
      setPdfStep('review');
    } finally {
      setIsExtracting(false);
    }
  }

  function handleAdditionalFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setAdditionalFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeAdditionalFile(idx: number) {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function submitApi() {
    intakePO({
      clientName,
      poNumber,
      source: 'API',
      catalogItemId: catalogItemId || activeCatalog[0]?.id || '',
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      notes: notes || undefined
    });
    navigate('/po');
  }

  function submitPdf() {
    if (!fileDataUrl) {
      setPdfError('Please upload a PDF before submitting.');
      return;
    }
    if (!lineItems.length) {
      setPdfError('Add at least one line item before saving.');
      return;
    }

    // Every extracted line item is saved as its own Purchase Order record,
    // sharing the common header details, so all of them appear directly in
    // the Customer PO list table.
    lineItems.forEach(li => {
      const matchedCatalog = activeCatalog.find(c => c.id === li.catalogItemId) || activeCatalog[0];
      intakePO({
        clientName: header.clientName.trim() || 'PDF Import Client',
        poNumber: header.poNumber.trim() || fileName?.replace(/\.[^/.]+$/, '') || 'PDF-IMPORT',
        source: 'PDF_IMPORT',
        fileName,
        fileDataUrl,
        catalogItemId: matchedCatalog?.id ?? '',
        partNumber: li.partNumber.trim() || undefined,
        quantity: Number(li.quantity) || 1,
        unitCost: Number(li.unitCost) || matchedCatalog?.clientListPrice || 0,
        supplier: header.supplier.trim() || undefined,
        shipment: header.shipment.trim() || undefined,
        country: header.country || undefined,
        state: header.state || undefined,
        city: header.city || undefined,
        notes: header.notes.trim()
      });
    });

    navigate('/po');
  }

  const fieldsLocked = selectedRow !== null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/po" className="text-sm font-medium text-slate-500 hover:text-brand-600">← Back to Customer POs</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Customer PO Intake</h1>
        <p className="text-sm text-slate-500">Upload PDF copy or enter details manually to register orders into the PO list.</p>
      </div>

      <div className="flex gap-1 p-1 a360-card w-fit">
        {(['PDF_IMPORT', 'API'] as PoSource[]).map(s => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${source === s ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {s === 'PDF_IMPORT' ? 'PDF Import' : 'Manual / API'}
          </button>
        ))}
      </div>

      {source === 'PDF_IMPORT' && (
        <div className="p-6 space-y-6 bg-white border shadow-sm rounded-2xl border-slate-200">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* PDF Upload */}
            <div className="flex flex-col justify-between p-4 border rounded-xl border-slate-200 bg-slate-50">
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Customer PO PDF</label>
                <p className="mb-3 text-xs text-slate-500">Upload the customer's PDF PO to extract details automatically.</p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer ${isExtracting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span>{isExtracting ? 'Extracting Data...' : 'Choose PO PDF'}</span>
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" disabled={isExtracting} onChange={onFile} />
                </label>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {fileName ? <span className="font-medium text-emerald-600">✓ {fileName}</span> : <span className="text-slate-400">No file selected</span>}
              </div>
            </div>

            {/* Additional Files Upload */}
            <div className="flex flex-col justify-between p-4 border rounded-xl border-slate-200 bg-slate-50">
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">Additional Files</label>
                <p className="mb-3 text-xs text-slate-500">Upload supporting docs (.xlsx, .doc, .msg, .pdf).</p>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.msg,.doc,.docx,.pdf"
                  onChange={handleAdditionalFiles}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                />
              </div>
              {additionalFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {additionalFiles.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                      <span className="truncate max-w-[200px] text-slate-700">{f.name}</span>
                      <button onClick={() => removeAdditionalFile(i)} className="ml-2 font-bold text-slate-400 hover:text-rose-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {pdfStep === 'extracting' && (
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 animate-pulse">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Parsing purchase order fields...
            </div>
          )}

          {pdfStep === 'review' && (
            <div className="p-5 space-y-5 border rounded-xl border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-wider uppercase text-emerald-800">Review / Edit Extracted Details</p>
                {fieldsLocked && <p className="text-[11px] font-semibold text-amber-700">Header fields locked while editing a line item — click the row again to unlock.</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Customer / Client Name</label>
                  <input
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.clientName}
                    disabled={fieldsLocked}
                    onChange={e => updateHeader({ clientName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Customer PO Number</label>
                  <input
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.poNumber}
                    disabled={fieldsLocked}
                    onChange={e => updateHeader({ poNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Supplier</label>
                  <input
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.supplier}
                    disabled={fieldsLocked}
                    onChange={e => updateHeader({ supplier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Shipment</label>
                  <input
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="e.g. Air Freight, Courier, Ground"
                    value={header.shipment}
                    disabled={fieldsLocked}
                    onChange={e => updateHeader({ shipment: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Country</label>
                  <select
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.country}
                    disabled={fieldsLocked}
                    onChange={e => onCountryChange(e.target.value)}
                  >
                    <option value="">Select country...</option>
                    {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">State / Region</label>
                  <select
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.state}
                    disabled={fieldsLocked || !header.country}
                    onChange={e => onStateChange(e.target.value)}
                  >
                    <option value="">Select state...</option>
                    {stateOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">City</label>
                  <select
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.city}
                    disabled={fieldsLocked || !header.state}
                    onChange={e => updateHeader({ city: e.target.value })}
                  >
                    <option value="">Select city...</option>
                    {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-full">
                  <label className="block mb-1 font-semibold text-slate-600">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 bg-white border rounded-lg border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    value={header.notes}
                    disabled={fieldsLocked}
                    onChange={e => updateHeader({ notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Import table — all detected line items from the PDF */}
              <div>
                <p className="mb-2 text-xs font-bold tracking-wider uppercase text-emerald-800">Line Items ({lineItems.length})</p>
                <div className="overflow-x-auto border rounded-lg border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-slate-500">Part Number</th>
                        <th className="px-2 py-2 text-left text-slate-500">Description</th>
                        <th className="px-2 py-2 text-left text-slate-500">Catalog Match</th>
                        <th className="px-2 py-2 text-right text-slate-500">Qty</th>
                        <th className="px-2 py-2 text-right text-slate-500">Unit Cost</th>
                        <th className="px-2 py-2 text-right text-slate-500">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li, i) => {
                        const matched = activeCatalog.find(c => c.id === li.catalogItemId);
                        const isSelected = selectedRow === i;
                        return (
                          <tr
                            key={i}
                            onClick={() => selectRow(i)}
                            className={`cursor-pointer border-t border-slate-100 ${isSelected ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                          >
                            <td className="px-2 py-2 font-medium text-slate-700">{li.partNumber || <span className="text-slate-400">—</span>}</td>
                            <td className="px-2 py-2 text-slate-600 max-w-[220px] truncate">{li.description || <span className="text-slate-400">—</span>}</td>
                            <td className="px-2 py-2 text-slate-600">{matched ? matched.currentGenModel : <span className="text-rose-500">No match</span>}</td>
                            <td className="px-2 py-2 text-right text-slate-700">{li.quantity}</td>
                            <td className="px-2 py-2 text-right text-slate-700">${li.unitCost.toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-semibold text-slate-800">${(li.quantity * li.unitCost).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={e => { e.stopPropagation(); deleteLineItem(i); }}
                                className="font-bold text-slate-400 hover:text-rose-600"
                                title="Delete line item"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!lineItems.length && (
                        <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">No line items — upload a PDF to extract them.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Editable fields for the currently-selected import row only */}
              {selectedRow !== null && lineItems[selectedRow] && (
                <div className="p-4 space-y-3 bg-white border rounded-lg border-indigo-200">
                  <p className="text-xs font-bold tracking-wider uppercase text-indigo-700">Editing Line Item {selectedRow + 1}</p>
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block mb-1 font-semibold text-slate-600">Part Number</label>
                      <input
                        className="w-full p-2 border rounded-lg border-slate-200"
                        value={lineItems[selectedRow].partNumber}
                        onChange={e => onPartNumberChange(selectedRow, e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-600">Catalog Item</label>
                      <select
                        className="w-full p-2 border rounded-lg border-slate-200"
                        value={lineItems[selectedRow].catalogItemId}
                        onChange={e => onLineCatalogChange(selectedRow, e.target.value)}
                      >
                        <option value="">No match — select manually...</option>
                        {catalogGroups.map(grp => (
                          <optgroup key={grp.label} label={grp.label}>
                            {grp.items.map(item => (
                              <option key={item.id} value={item.id}>{item.currentGenModel} — {item.currentGenSku}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-600">Description</label>
                      <input
                        className="w-full p-2 border rounded-lg border-slate-200"
                        value={lineItems[selectedRow].description}
                        onChange={e => updateLineItem(selectedRow, { description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-600">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded-lg border-slate-200"
                        value={lineItems[selectedRow].quantity}
                        onChange={e => updateLineItem(selectedRow, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-slate-600">Unit Cost ($ USD)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full p-2 border rounded-lg border-slate-200"
                        value={lineItems[selectedRow].unitCost}
                        onChange={e => updateLineItem(selectedRow, { unitCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setSelectedRow(null)} className="px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-700 hover:bg-indigo-50">
                      Done editing row
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {fileDataUrl && <PdfViewer dataUrl={fileDataUrl} fileName={fileName} />}
          {pdfError && <p className="text-sm text-rose-600">{pdfError}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link to="/po" className="px-4 py-2 text-xs font-semibold transition rounded-lg text-slate-600 hover:bg-slate-100">
              Cancel
            </Link>
            <button
              onClick={submitPdf}
              disabled={!fileDataUrl || isExtracting || !lineItems.length}
              className="px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
             Save Purchase Order
            </button>
          </div>
        </div>
      )}

      {source === 'API' && (
        <div className="p-6 space-y-4 bg-white border shadow-sm rounded-2xl border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Client Name</label>
              <input className="a360-input" value={clientName} onChange={e => setClientName(e.target.value)} required />
            </div>
            <div>
              <label className="a360-label">Client PO Number</label>
              <input className="a360-input" value={poNumber} onChange={e => setPoNumber(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Catalog Item</label>
              <select className="a360-input" value={catalogItemId} onChange={e => onCatalogChange(e.target.value)} required>
                <option value="" disabled>Select from approved catalog...</option>
                {catalogGroups.map(grp => (
                  <optgroup key={grp.label} label={grp.label}>
                    {grp.items.map(item => (
                      <option key={item.id} value={item.id}>{item.currentGenModel} — {item.currentGenSku}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="a360-label">Quantity</label>
              <input className="a360-input" type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
            </div>
          </div>

          <div>
            <label className="a360-label">Notes</label>
            <textarea className="a360-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link to="/po" className="px-4 py-2 text-xs font-semibold transition rounded-lg text-slate-600 hover:bg-slate-100">
              Cancel
            </Link>
            <button onClick={submitApi} className="px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
              Create Purchase Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
