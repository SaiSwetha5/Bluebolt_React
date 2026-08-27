import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import { MODEL_CATEGORIES, SERVICE_CLASSES, REPORTING_HIERARCHIES } from '../../types/models';
import type { CatalogCategory, ModelCategory, ServiceClass, ReportingHierarchy, CatalogItem } from '../../types/models';

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
  const { catalog, upsertCatalogItem } = useData();
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Catalog Management</h1>
          <p className="text-sm text-slate-500">All device requests must come from approved catalog items. Free-form device requests are not permitted.</p>
        </div>
        <button className="a360-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ New Catalog Item'}</button>
      </div>

      {showForm && (
        <div className="a360-card p-5 space-y-0">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
            {(['customer','vendor'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===tab?'bg-white text-slate-800':'text-slate-500 hover:text-slate-700'}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full inline-block ${tab==='customer'?'bg-brand-500':'bg-emerald-500'}`} />
                  {tab === 'customer' ? 'Customer catalog' : 'Vendor catalog'}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'customer' && (
            <div className="space-y-5">
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-700">Customer catalog — fields visible to end-users selecting devices in the shop. Fields marked * are customer-facing.</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Identity &amp; classification</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Shop content *</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Visibility &amp; service</p>
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
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">Vendor catalog — OEM-specific SKUs and ordering data from the HP EOL spreadsheet (H2 FY2026). Clicking a row in the reference table auto-fills the form.</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Model category &amp; EOL</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="a360-label">Model category</label><select className="a360-input" value={v.modelCategory} onChange={e => onVendorCategoryChange(e.target.value)}><option value="" disabled>Select model category...</option>{MODEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="a360-label">EOL / NPI timeline</label><input className="a360-input" value={v.eolTimeline} onChange={e => setV(p => ({...p,eolTimeline:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Current generation</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Product series</label><input className="a360-input" value={v.currentGenModel} onChange={e => setV(p => ({...p,currentGenModel:e.target.value}))} /></div>
                  <div><label className="a360-label">SKU</label><input className="a360-input" value={v.currentGenSku} onChange={e => setV(p => ({...p,currentGenSku:e.target.value}))} required /></div>
                  <div><label className="a360-label">Config details</label><input className="a360-input" value={v.currentGenConfigDetails} onChange={e => setV(p => ({...p,currentGenConfigDetails:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">New generation (EOL view)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="a360-label">Product series</label><input className="a360-input" value={v.newGenModel} onChange={e => setV(p => ({...p,newGenModel:e.target.value}))} /></div>
                  <div><label className="a360-label">SKU</label><input className="a360-input" value={v.newGenSku} onChange={e => setV(p => ({...p,newGenSku:e.target.value}))} /></div>
                  <div><label className="a360-label">Config details</label><input className="a360-input" value={v.newGenConfigDetails} onChange={e => setV(p => ({...p,newGenConfigDetails:e.target.value}))} /></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Ordering &amp; pricing</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">EOL catalog reference — click any row to apply</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                          <td className="a360-td font-semibold text-brand-700">{row.cat}</td>
                          <td className="a360-td">{row.curr}</td>
                          <td className="a360-td"><code className="bg-slate-100 px-1 rounded">{row.sku}</code></td>
                          <td className="a360-td">{row.newM}</td>
                          <td className="a360-td">{row.newS === 'WIP' ? <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">WIP</span> : <code className="bg-emerald-50 text-emerald-700 px-1 rounded">{row.newS}</code>}</td>
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
      <div className="a360-card overflow-x-auto">
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
                <td className="a360-td font-semibold text-brand-700">{row.cat}</td>
                <td className="a360-td font-medium text-slate-800">{row.curr}</td>
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

      {/* Catalog cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {catalog.map(item => (
          <div key={item.id} className="a360-card p-5 cursor-pointer hover:border-brand-300" onClick={() => navigate(`/catalog/${item.id}`)}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wide">{item.modelCategory}</p>
              <p className="text-[11px] text-slate-400">{item.region} · {item.country}</p>
            </div>
            <h2 className="text-sm font-semibold text-slate-800 mt-1">{item.currentGenModel}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <code className="text-[11px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{item.currentGenSku}</code>
              <span className="text-slate-300">→</span>
              <span className="text-[11px] text-slate-600">{item.newGenModel}</span>
              <code className="text-[11px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{item.newGenSku}</code>
            </div>
            <p className="text-xs text-slate-500 mt-1">{item.currentGenConfigDetails}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{item.category}</span>
              <span className="text-[10px] bg-brand-50 text-brand-600 rounded-full px-2 py-0.5">{item.persona}</span>
              <span className="text-[10px] bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">{item.eolTimeline}</span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-800">USD {item.clientListPrice.toLocaleString()} / unit</span>
              <span className="text-xs text-slate-400">{item.vendorMappings.length} vendor SKU(s)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
