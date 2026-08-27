import { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import PdfViewer from '../../components/ui/PdfViewer';

function fmt(ts: string) { return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

export default function GoodsReceipt() {
  const { vendorOrders, goodsReceipts, createGoodsReceipt } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qtyReceived, setQtyReceived] = useState(0);
  const [condition, setCondition] = useState<'Good'|'Damaged'|'Partial'>('Good');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [podFileName, setPodFileName] = useState<string | undefined>();
  const [podDataUrl, setPodDataUrl] = useState<string | undefined>();

  const deliveredAwaitingGrn = useMemo(() => {
    const ids = new Set(goodsReceipts.map(g => g.vendorOrderId));
    return vendorOrders.filter(v => v.status === 'DELIVERED' && !ids.has(v.id));
  }, [vendorOrders, goodsReceipts]);

  const selected = vendorOrders.find(v => v.id === selectedId);

  function select(id: string) { setSelectedId(id); const vo = vendorOrders.find(v => v.id === id); setQtyReceived(vo?.quantity ?? 0); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPodFileName(file.name);
    const r = new FileReader(); r.onload = () => setPodDataUrl(r.result as string); r.readAsDataURL(file);
  }
  function submit() {
    if (!selected) return;
    createGoodsReceipt({ vendorOrderId:selected.id, poId:selected.poId, quantityExpected:selected.quantity, quantityReceived:Number(qtyReceived), receivedBy, podFileName, podDataUrl, condition, notes:notes||undefined });
    setSelectedId(null); setPodFileName(undefined); setPodDataUrl(undefined); setNotes('');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Goods Receipt &amp; Proof of Delivery</h1>
        <p className="text-sm text-slate-500">Confirm receipt of delivered vendor orders and generate the GRN.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="a360-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Delivered Vendor Orders Awaiting Receipt</h2>
          {deliveredAwaitingGrn.map(vo => (
            <div key={vo.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-800">{vo.id} · {vo.vendor}</p><p className="text-xs text-slate-500">{vo.poId} · {vo.quantity} units · {vo.destination}</p></div>
              {selectedId !== vo.id && <button onClick={() => select(vo.id)} className="a360-btn-secondary text-xs">Receive</button>}
            </div>
          ))}
          {!deliveredAwaitingGrn.length && <p className="text-sm text-slate-400 text-center py-6">No deliveries pending receipt.</p>}
        </div>

        {selected && (
          <div className="a360-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Receive {selected.id} ({selected.vendor})</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="a360-label">Quantity Expected</label><input className="a360-input" value={selected.quantity} disabled /></div>
              <div><label className="a360-label">Quantity Received</label><input className="a360-input" type="number" min="0" max={selected.quantity} value={qtyReceived} onChange={e => setQtyReceived(Number(e.target.value))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="a360-label">Condition</label>
                <select className="a360-input" value={condition} onChange={e => setCondition(e.target.value as any)}>
                  <option>Good</option><option>Damaged</option><option>Partial</option>
                </select>
              </div>
              <div><label className="a360-label">Received By</label><input className="a360-input" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} required /></div>
            </div>
            <div><label className="a360-label">Proof of Delivery (POD)</label><input className="a360-input" type="file" accept="application/pdf,image/*" onChange={onFile} /></div>
            {podDataUrl && podFileName?.endsWith('.pdf') && <PdfViewer dataUrl={podDataUrl} fileName={podFileName} />}
            <div><label className="a360-label">Notes</label><textarea className="a360-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button className="a360-btn-secondary" onClick={() => setSelectedId(null)}>Cancel</button>
              <button className="a360-btn-primary" onClick={submit}>Generate GRN</button>
            </div>
          </div>
        )}
      </div>

      <div className="a360-card overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200"><h2 className="text-sm font-semibold text-slate-800">Recent Goods Receipts</h2></div>
        <table className="w-full">
          <thead><tr><th className="a360-th">GRN</th><th className="a360-th">Vendor Order</th><th className="a360-th">Qty</th><th className="a360-th">Condition</th><th className="a360-th">Received By</th><th className="a360-th">Received At</th></tr></thead>
          <tbody>
            {goodsReceipts.map(g => (
              <tr key={g.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{g.id}</td>
                <td className="a360-td">{g.vendorOrderId}</td>
                <td className="a360-td">{g.quantityReceived}/{g.quantityExpected}</td>
                <td className="a360-td"><StatusBadge status={g.condition} /></td>
                <td className="a360-td">{g.receivedBy}</td>
                <td className="a360-td text-slate-500">{fmt(g.receivedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
