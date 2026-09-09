import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import { MODEL_CATEGORIES, SERVICE_CLASSES, REPORTING_HIERARCHIES } from '../../types/models';
import type { CatalogCategory, ModelCategory, ServiceClass, ReportingHierarchy, CatalogItem } from '../../types/models';

// High-resolution clean hardware imagery mapped by product family / category
const DEVICE_IMAGE_MAP: Record<string, string> = {
  '14" Standard Notebook': 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80',
  '16" Standard Notebook': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
  '"Ultralight" Notebook': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
  '"Convertible" Notebook': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
  'Micro Desktops': 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&auto=format&fit=crop&q=80',
  'Performance Notebook (i9)': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80',
  'Performance Notebook': 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80',
  'Performance Desktops': 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&auto=format&fit=crop&q=80',
  'Ubuntu High-end': 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&auto=format&fit=crop&q=80',
  'Rackmount Workstation': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80';

const EOL_TABLE = [
  { cat:'14" Standard Notebook', curr:'HP EliteBook 8 G1i 14 AI', sku:'C40DKEC', newM:'HP EliteBook 8 G2i 14 inch', newS:'WIP', cfg:'14 inch display: touch: 16 GB RAM, 1 TB SSD, U5', eol:'EOL view July 2027 - H2 FY2026', newCfg:'14 inch display: touch: 16 GB RAM, 1 TB SSD, U5' },
  { cat:'16" Standard Notebook', curr:'HP EliteBook 8 G1i 16 AI', sku:'C3WY0EC', newM:'HP EliteBook 8 G2i 16 inch', newS:'WIP', cfg:'15 inch display: touch: 16 GB RAM, 1 TB SSD, U5', eol:'EOL view July 2027 - H2 FY2026', newCfg:'15 inch display: touch: 16 GB RAM, 1 TB SSD, U5' },
  { cat:'"Ultralight" Notebook', curr:'HP EliteBook Ultra G1i AI', sku:'C61MVEC', newM:'HP EliteBook X G2i', newS:'WIP', cfg:'UMA i5 + 1 TB SSD + 16 GB RAM + No WWAN', eol:'EOL view July 2027 - H2 FY2026', newCfg:'UMA i5 + 1 TB SSD + 16 GB RAM + No WWAN' },
  { cat:'"Convertible" Notebook', curr:'HP EliteBook X Flip G1i AI', sku:'C2ZK6EC', newM:'HP EliteBook X Flip G2i AI', newS:'WIP', cfg:'U5 + 1 TB SSD + 16 GB RAM + WWAN', eol:'EOL view July 2027 - H2 FY2026', newCfg:'U5 + 1 TB SSD + 16 GB RAM + WWAN' },
  { cat:'Micro Desktops', curr:'HP EliteDesk 8 G1i Mini', sku:'C41QWEC', newM:'HP EliteDesk 8 G2i Mini', newS:'WIP', cfg:'Intel Core i5 / 16 GB + 1TB SSD + WLAN', eol:'EOL view July 2027 - H2 FY2026', newCfg:'Intel Core i5 / 16 GB + 1TB SSD + WLAN' },
  { cat:'Performance Notebook (i9)', curr:'HP ZBook Fury G1i 16 O2O', sku:'C2EL5EC', newM:'Unchanged', newS:'C2EL5EC', cfg:'i9-285HX / 2TB SSD / 64GB / RTX 3000 Blackwell / No WWAN / Fingerprint / No NFC / Webcam', eol:'EOL view July 2027 - H2 FY2026', newCfg:'i9-285HX / 2TB SSD / 64GB / RTX 3000 Blackwell / No WWAN / Fingerprint / No NFC / Webcam' },
  { cat:'Performance Notebook', curr:'HP ZBook Fury G1i 16, i7 265HX', sku:'DA3X7EC', newM:'Unchanged', newS:'DA3X7EC', cfg:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, be+BT, 8C Batt, FPS, W11 Pro64', eol:'EOL view July 2027 - H2 FY2026', newCfg:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, be+BT, 8C Batt, FPS, W11 Pro64' },
  { cat:'Performance Desktops', curr:'HP Z2 Tower G1i', sku:'C2LW9EC', newM:'Unchanged', newS:'C2LW9EC', cfg:'U7-265K / 2TB SSD / 64GB / RTX A2000 / incl. Mouse / keyboard', eol:'EOL view July 2027 - H2 FY2026', newCfg:'U7-265K / 2TB SSD / 64GB / RTX A2000 / incl. Mouse / keyboard' },
  { cat:'Ubuntu High-end', curr:'HP ZBook Fury G1i 16, i7 265HX (Ubuntu)', sku:'DA3X7EC', newM:'Unchanged', newS:'DA3X7EC', cfg:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, FPS, Ubuntu Linux', eol:'EOL view July 2027 - H2 FY2026', newCfg:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, FPS, Ubuntu Linux' },
  { cat:'Rackmount Workstation', curr:'HP Z6 G5 W52545', sku:'W52545', newM:'Unchanged', newS:'W52545', cfg:'Intel Xeon W5-2545, 2.0TB SSD, 128GB DDR5, NVD RTX 4000 Ada', eol:'EOL view July 2027 - H2 FY2026', newCfg:'Intel Xeon W5-2545, 2.0TB SSD, 128GB DDR5, NVD RTX 4000 Ada' },
];

export default function CatalogList() {
  const { catalog = [], upsertCatalogItem } = useData();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer'|'vendor'>('customer');
  const [c, setC] = useState({ country:'', region:'APAC', clientCategory:'', category:'HW - DaaS Laptop' as CatalogCategory, persona:'', reportingHierarchy:'HW > Laptops > DaaS' as ReportingHierarchy, shopDescription:'', longDescription:'', detailedDescription:'', keywords:'', clientListPrice:1899, active:true, serviceClass:'DaaS Standard' as ServiceClass, touch:true });
  const [v, setV] = useState({ modelCategory:'' as ModelCategory|'', eolTimeline:'EOL view July 2027 - H2 FY2026', currentGenModel:'', currentGenSku:'', currentGenConfigDetails:'', newGenModel:'', newGenSku:'WIP', newGenConfigDetails:'', vendor:'HP', unitCost:0, skuType:'Non-Modern' as 'Modern'|'Non-Modern', npiDate:'NPI September 2027', channel:'Webshop Portal', leadTimeDays:10 });

  function applyEolRow(row: typeof EOL_TABLE[0]) {
    setV(prev => ({ ...prev, modelCategory:row.cat as ModelCategory, currentGenModel:row.curr, currentGenSku:row.sku, currentGenConfigDetails:row.cfg, newGenModel:row.newM, newGenSku:row.newS, newGenConfigDetails:row.newCfg, eolTimeline:row.eol }));
    setActiveTab('vendor');
  }

  function onVendorCategoryChange(cat: string) {
    const row = EOL_TABLE.find(r => r.cat === cat);
    if (row) applyEolRow(row); else setV(prev => ({ ...prev, modelCategory:cat as ModelCategory }));
  }

  function submit() {
    const id = 'CAT-' + Math.random().toString(36).slice(2,7).toUpperCase();
    upsertCatalogItem({
      id, active:c.active, touch:c.touch, category:c.category, name:c.shopDescription||v.currentGenModel,
      screenSize:'14"', ramGb:16, storageGb:1000, cpu:'Intel Core Ultra 5 (U5)',
      country:c.country, region:c.region, clientCategory:c.clientCategory, persona:c.persona, reportingHierarchy:c.reportingHierarchy,
      shopDescription:c.shopDescription, longDescription:c.longDescription, detailedDescription:c.detailedDescription, keywords:c.keywords,
      clientListPrice:Number(c.clientListPrice), serviceClass:c.serviceClass,
      modelCategory:v.modelCategory as ModelCategory, eolTimeline:v.eolTimeline,
      currentGenModel:v.currentGenModel, currentGenSku:v.currentGenSku, currentGenConfigDetails:v.currentGenConfigDetails,
      newGenModel:v.newGenModel, newGenSku:v.newGenSku, newGenConfigDetails:v.newGenConfigDetails,
      vendorMappings:[{ vendor:v.vendor as any, currentGenModel:v.currentGenModel, currentGenSku:v.currentGenSku, currentGenType:v.skuType, newGenModel:v.newGenModel, npiDate:v.npiDate, unitCost:Number(v.unitCost) }],
    } as CatalogItem, true);
    setShowForm(false);
  }

  // Browser download helper
  const handleDownloadSource = () => {
    const file = new Blob([/* CatalogList.tsx source */ ''], {
      type: 'text/typescript;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'CatalogList.tsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Catalog Management</h1>
          <p className="text-sm text-slate-500">All device requests must come from approved catalog items. Free-form device requests are not permitted.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSource}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            Download Code
          </button>
          <button 
            className="a360-btn-primary" 
            onClick={() => setShowForm(s => !s)}
          >
            {showForm ? 'Close Form' : '+ New Catalog Item'}
          </button>
        </div>
      </div>

      {/* Item Creation Modal/Panel */}
      {showForm && (
        <div className="p-5 space-y-0 a360-card">
          <div className="flex gap-1 p-1 mb-5 bg-slate-100 rounded-xl w-fit">
            {(['customer','vendor'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===tab?'bg-white text-slate-800 shadow-xs':'text-slate-500 hover:text-slate-700'}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full inline-block ${tab==='customer'?'bg-brand-500':'bg-emerald-500'}`} />
                  {tab === 'customer' ? 'Customer catalog' : 'Vendor catalog'}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'customer' && (
            <div className="space-y-5">
              <div className="px-4 py-3 text-xs border rounded-lg border-brand-200 bg-brand-50 text-brand-700">Customer catalog — fields visible to end-users selecting devices in the shop. Fields marked * are customer-facing.</div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Identity &amp; classification</p>
                <div className="grid grid-cols-3 gap-4">
                  {[['Country *','country',['India','United States','Germany','United Kingdom','Singapore']],['Region','region',['APAC','AMER','EMEA']],['Category * (shop)','clientCategory',['Notebooks & Laptops','Desktops','Workstation Notebooks','Workstation Desktops']]].map(([lbl,field,opts]) => (
                    <div key={field as string}><label className="a360-label">{lbl as string}</label><select className="a360-input" value={(c as any)[field as string]} onChange={e => setC(prev => ({...prev,[field as string]:e.target.value}))}><option value="" disabled>Select...</option>{(opts as string[]).map(o => <option key={o}>{o}</option>)}</select></div>
                  ))}
                  <div><label className="a360-label">Service category (internal)</label><select className="a360-input" value={c.category} onChange={e => setC(prev => ({...prev,category:e.target.value as CatalogCategory}))}><option>HW - DaaS Laptop</option><option>HW - DaaS Desktop</option><option>HW - Monitor</option></select></div>
                  <div><label className="a360-label">Persona</label><select className="a360-input" value={c.persona} onChange={e => setC(prev => ({...prev,persona:e.target.value}))}><option value="" disabled>Select...</option>{['Standard Office Worker','Executive','Field Technician','Power User'].map(o => <option key={o}>{o}</option>)}</select></div>
                  <div><label className="a360-label">Global reporting hierarchy</label><select className="a360-input" value={c.reportingHierarchy} onChange={e => setC(prev => ({...prev,reportingHierarchy:e.target.value as ReportingHierarchy}))}>{REPORTING_HIERARCHIES.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Shop content *</p>
                <div className="space-y-3">
                  <div><label className="a360-label">Description (shop listing title) * — TO BE CHECKED</label><input className="a360-input" value={c.shopDescription} onChange={e => setC(prev => ({...prev,shopDescription:e.target.value}))} placeholder="HP EliteBook X Flip G1i AI — U5, 1TB SSD, 16GB RAM + WWAN" /></div>
                  <div><label className="a360-label">Long description (bullet points) *</label><textarea className="a360-input" rows={3} value={c.longDescription} onChange={e => setC(prev => ({...prev,longDescription:e.target.value}))} /></div>
                  <div><label className="a360-label">Detailed description</label><textarea className="a360-input" rows={2} value={c.detailedDescription} onChange={e => setC(prev => ({...prev,detailedDescription:e.target.value}))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="a360-label">Keywords</label><input className="a360-input" value={c.keywords} onChange={e => setC(prev => ({...prev,keywords:e.target.value}))} /></div>
                    <div><label className="a360-label">Client list price (USD)</label><input className="a360-input" type="number" value={c.clientListPrice} onChange={e => setC(prev => ({...prev,clientListPrice:Number(e.target.value)}))} /></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Visibility &amp; service</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Active (shown in shop)</label><select className="a360-input" value={c.active ? 'true':'false'} onChange={e => setC(prev => ({...prev,active:e.target.value==='true'}))}><option value="true">Yes</option><option value="false">No</option></select></div>
                  <div><label className="a360-label">Service class</label><select className="a360-input" value={c.serviceClass} onChange={e => setC(prev => ({...prev,serviceClass:e.target.value as ServiceClass}))}>{SERVICE_CLASSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="a360-label">Touch screen</label><select className="a360-input" value={c.touch ? 'true':'false'} onChange={e => setC(prev => ({...prev,touch:e.target.value==='true'}))}><option value="true">Yes</option><option value="false">No</option></select></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendor' && (
            <div className="space-y-5">
              <div className="px-4 py-3 text-xs border rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700">Vendor catalog — OEM-specific SKUs and ordering data from the HP EOL spreadsheet (H2 FY2026). Clicking a row in the reference table auto-fills the form.</div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Model category &amp; EOL</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="a360-label">Model category</label><select className="a360-input" value={v.modelCategory} onChange={e => onVendorCategoryChange(e.target.value)}><option value="" disabled>Select model category...</option>{MODEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="a360-label">EOL / NPI timeline</label><input className="a360-input" value={v.eolTimeline} onChange={e => setV(p => ({...p,eolTimeline:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Current generation</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Product series</label><input className="a360-input" value={v.currentGenModel} onChange={e => setV(p => ({...p,currentGenModel:e.target.value}))} /></div>
                  <div><label className="a360-label">SKU</label><input className="a360-input" value={v.currentGenSku} onChange={e => setV(p => ({...p,currentGenSku:e.target.value}))} required /></div>
                  <div><label className="a360-label">Config details</label><input className="a360-input" value={v.currentGenConfigDetails} onChange={e => setV(p => ({...p,currentGenConfigDetails:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">New generation (EOL view)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Product series</label><input className="a360-input" value={v.newGenModel} onChange={e => setV(p => ({...p,newGenModel:e.target.value}))} /></div>
                  <div><label className="a360-label">SKU</label><input className="a360-input" value={v.newGenSku} onChange={e => setV(p => ({...p,newGenSku:e.target.value}))} /></div>
                  <div><label className="a360-label">Config details</label><input className="a360-input" value={v.newGenConfigDetails} onChange={e => setV(p => ({...p,newGenConfigDetails:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Ordering &amp; pricing</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Vendor</label><select className="a360-input" value={v.vendor} onChange={e => setV(p => ({...p,vendor:e.target.value}))}><option>HP</option><option>Dell</option><option>Lenovo</option></select></div>
                  <div><label className="a360-label">Unit cost (USD)</label><input className="a360-input" type="number" value={v.unitCost} onChange={e => setV(p => ({...p,unitCost:Number(e.target.value)}))} /></div>
                  <div><label className="a360-label">SKU type</label><select className="a360-input" value={v.skuType} onChange={e => setV(p => ({...p,skuType:e.target.value as any}))}><option>Non-Modern</option><option>Modern</option></select></div>
                  <div><label className="a360-label">NPI / delivery timeline</label><input className="a360-input" value={v.npiDate} onChange={e => setV(p => ({...p,npiDate:e.target.value}))} /></div>
                  <div><label className="a360-label">Procurement channel</label><select className="a360-input" value={v.channel} onChange={e => setV(p => ({...p,channel:e.target.value}))}><option>Webshop Portal</option><option>Integrated Procurement API</option><option>EDI</option></select></div>
                  <div><label className="a360-label">Lead time (days)</label><input className="a360-input" type="number" value={v.leadTimeDays} onChange={e => setV(p => ({...p,leadTimeDays:Number(e.target.value)}))} /></div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">EOL catalog reference — click any row to apply</p>
                <div className="overflow-x-auto border rounded-lg border-slate-200">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50">
                      <th className="a360-th">Category</th>
                      <th className="a360-th" style={{background:'#EFF6FF',color:'#1D4ED8'}}>Current gen</th>
                      <th className="a360-th" style={{background:'#EFF6FF',color:'#1D4ED8'}}>SKU</th>
                      <th className="a360-th" style={{background:'#ECFDF5',color:'#065F46'}}>New gen</th>
                      <th className="a360-th" style={{background:'#ECFDF5',color:'#065F46'}}>New SKU</th>
                    </tr></thead>
                    <tbody>
                      {EOL_TABLE.map(row => (
                        <tr key={row.cat} className={`cursor-pointer ${v.modelCategory === row.cat ? 'bg-brand-50' : 'hover:bg-slate-50'}`} onClick={() => applyEolRow(row)}>
                          <td className="font-semibold a360-td text-brand-700">{row.cat}</td>
                          <td className="a360-td">{row.curr}</td>
                          <td className="a360-td"><code className="px-1 rounded bg-slate-100">{row.sku}</code></td>
                          <td className="a360-td">{row.newM}</td>
                          <td className="a360-td">{row.newS === 'WIP' ? <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">WIP</span> : <code className="px-1 rounded bg-emerald-50 text-emerald-700">{row.newS}</code>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400">Complete both tabs — the item combines customer-facing and vendor data.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="a360-btn-secondary">Cancel</button>
              <button type="button" onClick={submit} className="a360-btn-primary">Save catalog item</button>
            </div>
          </div>
        </div>
      )}

      {/* EOL overview table */}
      <div className="overflow-x-auto a360-card">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">OEM Catalog — HP EOL H2 FY2026</h2>
          <p className="text-xs text-slate-400 mt-0.5">Current → new generation mapping. All POs and requisitions must reference an item from this catalog.</p>
        </div>
        <table className="w-full text-xs">
          <thead><tr>
            <th className="a360-th">Model category</th>
            <th className="a360-th" style={{background:'#EFF6FF',color:'#1D4ED8'}}>Current gen</th>
            <th className="a360-th" style={{background:'#EFF6FF',color:'#1D4ED8'}}>SKU</th>
            <th className="a360-th" style={{background:'#EFF6FF',color:'#1D4ED8'}}>Config</th>
            <th className="a360-th" style={{background:'#ECFDF5',color:'#065F46'}}>New gen</th>
            <th className="a360-th" style={{background:'#ECFDF5',color:'#065F46'}}>New SKU</th>
            <th className="a360-th" style={{color:'#D97706'}}>EOL timeline</th>
          </tr></thead>
          <tbody>
            {EOL_TABLE.map(row => (
              <tr key={row.cat} className="hover:bg-slate-50">
                <td className="font-semibold a360-td text-brand-700">{row.cat}</td>
                <td className="font-medium a360-td text-slate-800">{row.curr}</td>
                <td className="a360-td"><code className="bg-slate-100 px-1.5 py-0.5 rounded">{row.sku}</code></td>
                <td className="a360-td text-slate-500">{row.cfg}</td>
                <td className="a360-td text-slate-700">{row.newM}</td>
                <td className="a360-td">{row.newS === 'WIP' ? <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">WIP</span> : <code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{row.newS}</code>}</td>
                <td className="a360-td text-amber-600">{row.eol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Catalog Cards with Hardware Images */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {catalog.map(item => {
          const imageUrl = DEVICE_IMAGE_MAP[item.modelCategory] || DEFAULT_IMAGE;

          return (
            <div
              key={item.id}
              className="flex flex-col p-0 overflow-hidden transition-all bg-white border cursor-pointer a360-card hover:border-brand-300 hover:shadow-md sm:flex-row border-slate-200 rounded-xl"
              onClick={() => navigate(`/catalog/${item.id}`)}
            >
              {/* Product Thumbnail Banner */}
              <div className="relative flex-shrink-0 w-full overflow-hidden border-b sm:w-44 h-44 sm:h-auto bg-slate-100 sm:border-b-0 sm:border-r border-slate-100">
                <img
                  src={imageUrl}
                  alt={item.currentGenModel || 'Hardware'}
                  className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to default if OEM external URL fails
                    (e.target as HTMLElement).setAttribute('src', DEFAULT_IMAGE);
                  }}
                />
                <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                  {item.category?.replace('HW - ', '') || 'DaaS Hardware'}
                </span>
              </div>

              {/* Product Content Details */}
              <div className="flex flex-col justify-between flex-1 p-4 space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-brand-600 uppercase tracking-wide truncate">
                      {item.modelCategory}
                    </p>
                    <p className="text-[11px] text-slate-400 whitespace-nowrap">
                      {item.region} · {item.country || 'Global'}
                    </p>
                  </div>

                  <h2 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                    {item.currentGenModel}
                  </h2>

                  {/* SKU Transition Flow */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <code className="text-[10px] bg-slate-100 text-slate-700 font-mono rounded px-1.5 py-0.5 border border-slate-200">
                      {item.currentGenSku}
                    </code>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[140px]">
                      {item.newGenModel}
                    </span>
                    <code className="text-[10px] bg-emerald-50 text-emerald-700 font-mono rounded px-1.5 py-0.5 border border-emerald-200">
                      {item.newGenSku}
                    </code>
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {item.currentGenConfigDetails}
                  </p>
                </div>

                <div>
                  {/* Meta Chips */}
                  <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                    <span className="text-[10px] bg-slate-100 text-slate-600 rounded-md px-2 py-0.5 font-medium">
                      {item.persona || 'Standard'}
                    </span>
                    <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded-md px-2 py-0.5 font-medium truncate max-w-[160px]">
                      {item.eolTimeline}
                    </span>
                    {item.touch && (
                      <span className="text-[10px] bg-sky-50 border border-sky-200 text-sky-700 rounded-md px-2 py-0.5 font-medium">
                        Touch
                      </span>
                    )}
                  </div>

                  {/* Footer Pricing & Vendor Count */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs text-slate-400">List Price: </span>
                      <span className="text-sm font-bold text-slate-900">
                        ${Number(item.clientListPrice || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400"> / unit</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {item.vendorMappings?.length || 1} vendor SKU(s)
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}