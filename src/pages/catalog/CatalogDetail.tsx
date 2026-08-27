import { useParams, Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';

export default function CatalogDetail() {
  const { id } = useParams<{ id: string }>();
  const { catalog } = useData();
  const c = catalog.find(x => x.id === id);

  if (!c) return <div className="text-center text-slate-400 py-16">Catalog item not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/catalog" className="text-sm text-slate-500 hover:text-brand-600">← Back to Catalog</Link>
          <h1 className="text-lg font-bold text-slate-800 mt-1">{c.currentGenModel}</h1>
          <p className="text-sm text-slate-500">{c.modelCategory} · SKU {c.currentGenSku} · {c.region}, {c.country}</p>
        </div>
      </div>

      {/* OEM EOL Catalog Panel */}
      <div className="a360-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">OEM Catalog — Current vs Next Generation</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Field</th>
                <th className="px-4 py-2 text-left bg-blue-50 text-blue-700">Current Generation</th>
                <th className="px-4 py-2 text-left bg-emerald-50 text-emerald-700">New Generation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-4 py-2.5 text-slate-400 font-medium text-xs uppercase">Model Category</td><td className="px-4 py-2.5 font-medium text-slate-800 bg-blue-50/30" colSpan={2}>{c.modelCategory}</td></tr>
              <tr><td className="px-4 py-2.5 text-slate-400 font-medium text-xs uppercase">Product Series</td><td className="px-4 py-2.5 font-medium text-slate-800">{c.currentGenModel}</td><td className="px-4 py-2.5 font-medium text-slate-800">{c.newGenModel}</td></tr>
              <tr><td className="px-4 py-2.5 text-slate-400 font-medium text-xs uppercase">SKU</td><td className="px-4 py-2.5"><code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{c.currentGenSku}</code></td><td className="px-4 py-2.5"><code className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs">{c.newGenSku}</code></td></tr>
              <tr><td className="px-4 py-2.5 text-slate-400 font-medium text-xs uppercase">Config Details</td><td className="px-4 py-2.5 text-slate-700">{c.currentGenConfigDetails}</td><td className="px-4 py-2.5 text-slate-700">{c.newGenConfigDetails}</td></tr>
              <tr><td className="px-4 py-2.5 text-slate-400 font-medium text-xs uppercase">EOL / NPI Timeline</td><td className="px-4 py-2.5 text-amber-700 font-medium" colSpan={2}>{c.eolTimeline}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor SKU Mappings */}
      <div className="a360-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Vendor SKU Mappings</h2>
          <span className="text-xs text-slate-400">{c.vendorMappings.length} vendor(s)</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr><th className="a360-th">Vendor</th><th className="a360-th">Current Gen Model</th><th className="a360-th">Current Gen SKU</th><th className="a360-th">Type</th><th className="a360-th">New Gen Model</th><th className="a360-th">NPI Date</th><th className="a360-th">Unit Cost</th></tr></thead>
          <tbody>
            {c.vendorMappings.map(vm => (
              <tr key={vm.vendor + vm.currentGenSku} className="hover:bg-slate-50">
                <td className="a360-td font-semibold">{vm.vendor}</td>
                <td className="a360-td">{vm.currentGenModel}</td>
                <td className="a360-td"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{vm.currentGenSku}</code></td>
                <td className="a360-td"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${vm.currentGenType === 'Non-Modern' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{vm.currentGenType}</span></td>
                <td className="a360-td">{vm.newGenModel}</td>
                <td className="a360-td text-slate-500">{vm.npiDate}</td>
                <td className="a360-td font-semibold">${vm.unitCost.toLocaleString()}</td>
              </tr>
            ))}
            {!c.vendorMappings.length && <tr><td colSpan={7} className="a360-td text-center text-slate-400 py-6">No vendor mappings yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Client-Facing Shop Details */}
      <div className="a360-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Client-Facing Shop Details</h2>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate-400">Region / Country</dt><dd className="font-medium text-slate-800">{c.region} / {c.country}</dd>
          <dt className="text-slate-400">Category (shop)</dt><dd className="font-medium text-slate-800">{c.clientCategory}</dd>
          <dt className="text-slate-400">Persona</dt><dd className="font-medium text-slate-800">{c.persona}</dd>
          <dt className="text-slate-400">Client List Price</dt><dd className="font-medium text-slate-800">${c.clientListPrice.toLocaleString()}</dd>
          <dt className="text-slate-400">Shop Title</dt><dd className="font-medium text-slate-800">{c.shopDescription}</dd>
        </dl>
        <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Highlights</p><p className="text-sm text-slate-600 whitespace-pre-line">{c.longDescription}</p></div>
        <div className="pt-2 border-t border-slate-100"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Full Spec / Approvals / Delivery</p><p className="text-sm text-slate-600 whitespace-pre-line">{c.detailedDescription}</p></div>
      </div>
    </div>
  );
}
