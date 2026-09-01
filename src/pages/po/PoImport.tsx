import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import PdfViewer from '../../components/ui/PdfViewer';
import type { CatalogItem, PoSource } from '../../types/models';

type PdfStep = 'upload' | 'extracting' | 'review';

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: { str?: string }) => it.str ?? '').join(' '));
  }
  return pages.join('\n');
}

function extractField(t: string, ...pats: RegExp[]): string {
  for (const re of pats) { const m = t.match(re); if (m?.[1]?.trim()) return m[1].trim(); }
  return '';
}

function bestCatalogMatch(primary: string, fullText: string, catalog: CatalogItem[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const p = norm(primary); const f = norm(fullText);
  let bestId = '', bestScore = 0;
  for (const item of catalog) {
    const haystack = [item.name, item.shopDescription, item.currentGenModel, item.newGenModel, item.currentGenSku, item.newGenSku, item.longDescription, item.modelCategory, item.cpu, ...item.vendorMappings.map(v => `${v.vendor} ${v.currentGenModel} ${v.currentGenSku} ${v.newGenModel}`)].map(norm).join(' | ');
    const tokens = new Set(haystack.split(/[\s|]+/).filter(w => w.length > 2));
    let score = 0;
    for (const t2 of tokens) { if (p.includes(t2)) score += 3; else if (f.includes(t2)) score += 1; }
    for (const brand of ['hp','dell','lenovo']) { if (haystack.includes(brand) && (p.includes(brand) || f.includes(brand))) score += 2; }
    const specPat = /\b(\d+(?:gb|tb|ghz|inch|"|core))\b/gi;
    const hSpecs = [...haystack.matchAll(specPat)].map(m => m[1].toLowerCase());
    const pSpecs = [...(p+' '+f).matchAll(specPat)].map(m => m[1].toLowerCase());
    for (const sp of hSpecs) { if (pSpecs.includes(sp)) score += 2; }
    if (score > bestScore) { bestScore = score; bestId = item.id; }
  }
  return bestScore >= 3 ? bestId : '';
}

export default function PoImport() {
  const { intakePO, catalog } = useData();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PoSource>('API');

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
  const [extractedData, setExtractedData] = useState<{ clientName:string; poNumber:string; catalogItem:string; catalogItemId:string; quantity:number; notes:string } | null>(null);

  const activeCatalog = catalog.filter(c => c.active);

  // Catalog groups for optgroup
  const catalogGroups = (() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of activeCatalog) { const key = item.modelCategory || item.category; if (!map.has(key)) map.set(key,[]); map.get(key)!.push(item); }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  })();

  const selectedItem = activeCatalog.find(c => c.id === catalogItemId);
  const selectedCost = selectedItem?.vendorMappings[0]?.unitCost ?? selectedItem?.clientListPrice ?? 0;

  function onCatalogChange(id: string) {
    setCatalogItemId(id);
    const item = activeCatalog.find(c => c.id === id);
    if (item) setUnitCost(item.vendorMappings[0]?.unitCost ?? item.clientListPrice);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setPdfError(''); setIsExtracting(true); setPdfStep('extracting');
    try {
      const [arrayBuffer, dataUrl] = await Promise.all([
        file.arrayBuffer(),
        new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); })
      ]);
      setFileDataUrl(dataUrl);
      const rawText = await extractTextFromPdf(arrayBuffer);
      const t = rawText.replace(/\s+/g,' ');
      const cName = extractField(t, /Client Name\s*[:\-]?\s*(.*?)\s*(Client PO Number|PO Number|Catalog Item)/i, /Bill[\s-]*To[:\s]+([^\n|,]+)/i);
      const pNum = extractField(t, /(?:Client PO Number|PO Number|PO#)\s*[:\-]?\s*([A-Z0-9\-_]+)/i, /\b([A-Z]{2,}-PO-\d+)\b/i);
      const catRaw = extractField(t, /Catalog\s*Item[:\s]+([^\n|]+)/i, /(?:Item Description|Model)[:\s]+([^\n|]+)/i);
      const qtyRaw = extractField(t, /Quantity[:\s]+(\d[\d,]*)/i, /Qty[:\s]+(\d[\d,]*)/i);
      const notesRaw = extractField(t, /Notes?\s*[:\-]?\s*(.*)/i);
      const qty = parseInt(qtyRaw.replace(/,/g,''), 10) || 1;
      const matchedId = bestCatalogMatch(catRaw || t, t, activeCatalog);
      setExtractedData({ clientName: cName, poNumber: pNum, catalogItem: catRaw, catalogItemId: matchedId, quantity: qty, notes: notesRaw });
      setPdfStep('review');
    } catch (err) {
      setPdfError('Failed to extract text from PDF. You can still submit with manual review.');
      setPdfStep('review');
    } finally {
      setIsExtracting(false);
    }
  }

  function submitApi() {
    const po = intakePO({ clientName, poNumber, source:'API', catalogItemId: catalogItemId || activeCatalog[0]?.id || '', quantity: Number(quantity), unitCost: Number(unitCost), notes: notes || undefined });
    navigate(`/po/${po.id}`);
  }

  function submitPdf() {
    if (!fileDataUrl) { setPdfError('Please upload a PDF before submitting.'); return; }
    const parsed = extractedData;
    const matchedCatalog = activeCatalog.find(c => c.id === parsed?.catalogItemId) || activeCatalog[0];
    const up = matchedCatalog?.vendorMappings?.[0]?.unitCost ?? matchedCatalog?.clientListPrice ?? 0;
    const po = intakePO({
      clientName: parsed?.clientName?.trim() || 'PDF Import Client',
      poNumber: parsed?.poNumber?.trim() || fileName?.replace(/\.[^/.]+$/,'') || 'PDF-IMPORT',
      source: 'PDF_IMPORT', fileName, fileDataUrl,
      catalogItemId: matchedCatalog?.id ?? '',
      quantity: parsed?.quantity && !isNaN(parsed.quantity) ? parsed.quantity : 1,
      unitCost: up,
      notes: parsed?.notes?.trim() || `Imported from PDF: ${fileName ?? ''}`,
    });
    navigate(`/po/${po.id}`);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link to="/po" className="text-sm text-slate-500 hover:text-brand-600">← Back to Customer POs</Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Customer PO Intake</h1>
        <p className="text-sm text-slate-500">Receive a purchase order directly via integration or import a PDF copy.</p>
      </div>

      <div className="flex gap-1 p-1 a360-card w-fit">
        {(['API','PDF_IMPORT'] as PoSource[]).map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${source === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {s === 'API' ? 'Create Customer PO' : 'PDF Import'}
          </button>
        ))}
      </div>

      {source === 'PDF_IMPORT' && (
        <div className="p-5 space-y-4 a360-card">
          <h2 className="text-sm font-semibold text-slate-800">Upload PO PDF</h2>
          <p className="text-xs text-slate-500">Upload the customer's PDF purchase order. Asset360 will extract the PO details automatically.</p>
          <div>
            <label className="a360-label">PO PDF Document</label>
            <div className="flex items-center gap-3">
              <label className={`a360-btn-secondary cursor-pointer ${isExtracting ? 'opacity-50' : ''}`}>
                <span>{isExtracting ? 'Extracting Data...' : 'Upload PDF'}</span>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" disabled={isExtracting} onChange={onFile} />
              </label>
              {fileName ? <span className="text-sm text-slate-600"><span className="font-medium text-emerald-600">✓</span> {fileName}</span>
                : <span className="text-sm text-slate-400">No file chosen</span>}
            </div>
          </div>

          {pdfStep === 'extracting' && (
            <div className="flex items-center gap-2 text-sm text-brand-600">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Analysing PDF...
            </div>
          )}

          {extractedData && pdfStep === 'review' && (
            <div className="p-4 space-y-2 text-xs border rounded-lg border-emerald-200 bg-emerald-50">
              <p className="font-semibold tracking-wide uppercase text-emerald-800">Extracted PO Details</p>
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div><p className="font-medium text-slate-500">Client Name:</p><p className="font-semibold">{extractedData.clientName || 'N/A'}</p></div>
                <div><p className="font-medium text-slate-500">PO Number:</p><p className="font-semibold">{extractedData.poNumber || 'N/A'}</p></div>
                <div><p className="font-medium text-slate-500">Catalog Item:</p><p className="font-semibold">{extractedData.catalogItem || 'N/A'}</p></div>
                <div><p className="font-medium text-slate-500">Quantity:</p><p className="font-semibold">{extractedData.quantity}</p></div>
                {extractedData.notes && <div className="col-span-2"><p className="font-medium text-slate-500">Notes:</p><p>{extractedData.notes}</p></div>}
              </div>
            </div>
          )}

          {fileDataUrl && <PdfViewer dataUrl={fileDataUrl} fileName={fileName} />}
          {pdfError && <p className="text-sm text-rose-600">{pdfError}</p>}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Link to="/po" className="a360-btn-secondary">Cancel</Link>
            <button onClick={submitPdf} className="a360-btn-primary" disabled={!fileDataUrl || isExtracting}>Submit PO</button>
          </div>
        </div>
      )}

      {source === 'API' && (
        <div className="p-5 space-y-4 a360-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Client Name</label>
              <input className="a360-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Meridian Financial Group" required />
            </div>
            <div>
              <label className="a360-label">Client PO Number</label>
              <input className="a360-input" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="e.g. MFG-PO-88301" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Catalog Item <span className="text-rose-500">*</span></label>
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

          {selectedItem && (
            <div className="p-4 space-y-2 text-xs border rounded-lg border-slate-200 bg-slate-50">
              <p className="font-semibold tracking-wide uppercase text-brand-600">{selectedItem.modelCategory}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-slate-400">Current gen config</p><p className="font-medium text-slate-700">{selectedItem.currentGenConfigDetails}</p></div>
                <div><p className="text-slate-400">New gen model</p><p className="font-medium text-slate-700">{selectedItem.newGenModel} <span className="text-emerald-600">({selectedItem.newGenSku})</span></p></div>
                <div><p className="text-slate-400">Unit cost</p><p className="font-medium text-slate-700">USD {selectedCost.toLocaleString()}</p></div>
                <div><p className="text-slate-400">EOL timeline</p><p className="font-medium text-amber-600">{selectedItem.eolTimeline}</p></div>
              </div>
            </div>
          )}

          <div>
            <label className="a360-label">Notes</label>
            <textarea className="a360-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional context for this request" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Link to="/po" className="a360-btn-secondary">Cancel</Link>
            <button onClick={submitApi} className="a360-btn-primary">Submit PO to Asset360</button>
          </div>
        </div>
      )}
    </div>
  );
}
