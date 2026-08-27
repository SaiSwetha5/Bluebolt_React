import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { PrStatus } from '../../types/models';

const FILTERS: ('ALL' | PrStatus)[] = ['ALL','DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CONVERTED'];

export default function PrList() {
  const { purchaseRequisitions, catalog } = useData();
  const navigate = useNavigate();
  const [active, setActive] = useState<'ALL' | PrStatus>('ALL');
  const filtered = active === 'ALL' ? purchaseRequisitions : purchaseRequisitions.filter(pr => pr.status === active);
  const catName = (id: string) => catalog.find(c => c.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Purchase Requisitions</h1>
          <p className="text-sm text-slate-500">Internal requests to procure against an approved Customer PO, netted against existing warehouse stock and open vendor orders. Approval here is required before a Cognizant PO can be raised to a vendor.</p>
        </div>
        <Link to="/procurement/requisitions/new" className="a360-btn-primary">+ New Requisition</Link>
      </div>
      <div className="a360-card p-3 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActive(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${active===f?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {f==='ALL'?'All':f.replace(/_/g,' ')}
          </button>
        ))}
      </div>
      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">PR ID</th><th className="a360-th">Customer PO</th><th className="a360-th">Catalog Item</th>
            <th className="a360-th">Requested</th><th className="a360-th">In Stock</th>
            <th className="a360-th">Balance</th><th className="a360-th">Est. Cost</th><th className="a360-th">Status</th><th className="a360-th">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(pr => (
              <tr key={pr.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700"><Link to={`/procurement/requisitions/${pr.id}`}>{pr.id}</Link></td>
                <td className="a360-td text-slate-500">{pr.poId}</td>
                <td className="a360-td">{catName(pr.catalogItemId)}</td>
                <td className="a360-td">{pr.requestedQty}</td>
                <td className="a360-td text-slate-500">{pr.inStockQty}</td>
                <td className="a360-td font-semibold">{pr.balanceQty}</td>
                <td className="a360-td">${pr.estimatedTotalCost.toLocaleString()}</td>
                <td className="a360-td"><StatusBadge status={pr.status} /></td>
                <td className="a360-td"><button onClick={() => navigate(`/procurement/requisitions/${pr.id}`)} className="a360-btn-secondary text-xs px-2.5 py-1">Open</button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={10} className="a360-td text-center text-slate-400 py-8">No requisitions in this state.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
