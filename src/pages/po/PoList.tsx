import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import type { PoStatus } from '../../types/models';

const FILTERS: ('ALL' | PoStatus)[] = ['ALL', 'RECEIVED', 'ACKNOWLEDGED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

export default function PoList() {
  const { purchaseOrders } = useData();
  const navigate = useNavigate();
  const [active, setActive] = useState<'ALL' | PoStatus>('ALL');

  const filtered = active === 'ALL' ? purchaseOrders : purchaseOrders.filter(p => p.status === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Customer Purchase Orders</h1>
          <p className="text-sm text-slate-500">Intake, acknowledgment and approval queue for POs received from clients — distinct from Cognizant's own POs to vendors, raised later in Procurement.</p>
        </div>
        <Link to="/po/customImport" className="a360-btn-primary">+ New Customer PO Intake</Link>
      </div>

      <div className="flex flex-wrap gap-2 p-3 a360-card">
        
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActive(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${active === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {f === 'ALL' ? 'All' : f.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto a360-card">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Customer PO ID</th><th className="a360-th">Customer PO Number</th><th className="a360-th">Client</th>
            <th className="a360-th">Source</th><th className="a360-th">Qty</th><th className="a360-th">Unit Cost</th>
            <th className="a360-th">Submitted</th>
          </tr></thead>
          <tbody>
            {filtered.map(po => (
              <tr key={po.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/po/${po.id}`)}>
                <td className="font-medium a360-td text-brand-700">{po.id}</td>
                <td className="a360-td">{po.poNumber}</td>
                <td className="a360-td">{po.clientName}</td>
                <td className="a360-td">{po.source === 'PDF_IMPORT' ? 'PDF Import' : 'API Integration'}</td>
                <td className="a360-td">{po.quantity}</td>
                <td className="a360-td">${po.unitCost.toLocaleString()}</td>
                <td className="a360-td text-slate-500">{new Date(po.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="py-8 text-center a360-td text-slate-400">No purchase orders in this state.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
