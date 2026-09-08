import React, { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import PdfViewer from '../../components/ui/PdfViewer';

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GoodsReceipt() {
  const { vendorOrders = [], goodsReceipts = [], createGoodsReceipt } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Direct intake quantities: Good and Damaged only
  const [qtyGood, setQtyGood] = useState<number>(0);
  const [qtyDamaged, setQtyDamaged] = useState<number>(0);
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [podFileName, setPodFileName] = useState<string | undefined>();
  const [podDataUrl, setPodDataUrl] = useState<string | undefined>();

  // Filter delivered orders awaiting GRN
  const deliveredAwaitingGrn = useMemo(() => {
    const ids = new Set(goodsReceipts.map((g: any) => g.vendorOrderId));
    return vendorOrders.filter((v: any) => v.status === 'DELIVERED' && !ids.has(v.id));
  }, [vendorOrders, goodsReceipts]);

  const selected = vendorOrders.find((v: any) => v.id === selectedId);

  // Pre-fill quantities when an order is picked
  function select(id: string) {
    setSelectedId(id);
    const vo = vendorOrders.find((v: any) => v.id === id);
    const total = vo?.quantity ?? 0;
    setQtyGood(total);
    setQtyDamaged(0);
    setNotes('');
  }

  const expectedQty = selected?.quantity ?? 0;
  const totalReceived = qtyGood + qtyDamaged;
  const isOverReceived = totalReceived > expectedQty;

  // Condition is strictly Good or Damaged
  const evaluatedCondition: 'Good' | 'Damaged' = qtyDamaged > 0 ? 'Damaged' : 'Good';

  // Overall Historical Metrics for Screen Header (Good & Damaged only)
  const metrics = useMemo(() => {
    let totalGood = 0;
    let totalDamaged = 0;

    goodsReceipts.forEach((gr: any) => {
      const good = Number(gr.qtyGood ?? (gr.condition === 'Good' ? gr.quantityReceived : 0));
      const damaged = Number(gr.qtyDamaged ?? (gr.condition === 'Damaged' ? gr.quantityReceived : 0));

      totalGood += good;
      totalDamaged += damaged;
    });

    return { totalGood, totalDamaged };
  }, [goodsReceipts]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPodFileName(file.name);
    const r = new FileReader();
    r.onload = () => setPodDataUrl(r.result as string);
    r.readAsDataURL(file);
  }

  function submit() {
    if (!selected) return;
    if (isOverReceived) {
      alert(`Total received count (${totalReceived}) exceeds expected quantity (${expectedQty}).`);
      return;
    }
    if (!receivedBy.trim()) {
      alert('Please enter who received this shipment.');
      return;
    }

    const payload = {
      vendorOrderId: selected.id,
      poId: selected.poId,
      quantityExpected: expectedQty,
      quantityReceived: totalReceived,
      qtyGood,
      qtyDamaged,
      condition: evaluatedCondition,
      receivedBy,
      podFileName,
      podDataUrl,
      notes: notes.trim() || undefined,
    };

    createGoodsReceipt(payload);
    setSelectedId(null);
    setPodFileName(undefined);
    setPodDataUrl(undefined);
    setNotes('');
  }

 

  return (
    <div className="space-y-5">
      {/* Header with Title and Metrics Bar */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Goods Receipt &amp; Proof of Delivery</h1>
          <p className="text-xs text-slate-500">
            Log itemized warehouse intake, inspect condition, and record verified stock counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
            <span>Good Units:</span>
            <span>{metrics.totalGood}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
            <span>Damaged Units:</span>
            <span>{metrics.totalDamaged}</span>
          </div>
        
        </div>
      </div>

      {/* Main Receiving Workspace */}
      <div className="grid items-start grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Pending Deliveries List */}
        <div className="p-5 space-y-3 bg-white border shadow-sm a360-card rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Delivered Orders Awaiting Intake</h2>
            <span className="text-xs font-medium text-slate-500">{deliveredAwaitingGrn.length} pending</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {deliveredAwaitingGrn.map((vo: any) => {
              const isCurrent = selectedId === vo.id;
              return (
                <div
                  key={vo.id}
                  className={`rounded-lg border p-3 flex items-center justify-between transition-colors ${
                    isCurrent ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {vo.id} <span className="font-normal text-slate-600">· {vo.vendor}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PO: {vo.poId} · <span className="font-semibold text-slate-700">{vo.quantity} units</span> · {vo.destination || 'Main Warehouse'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => select(vo.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isCurrent ? 'Inspecting' : 'Receive'}
                  </button>
                </div>
              );
            })}
            {!deliveredAwaitingGrn.length && (
              <p className="py-10 text-xs text-center text-slate-400">No deliveries pending intake.</p>
            )}
          </div>
        </div>

        {/* Selected Intake Form */}
        {selected ? (
          <div className="p-5 space-y-4 bg-white border shadow-sm a360-card rounded-xl border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Intake Inspection: <span className="font-mono text-blue-600">{selected.id}</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Vendor: {selected.vendor || 'Supplier'} &bull; PO: {selected.poId} &bull; Expected: <span className="font-semibold">{expectedQty}</span> units
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Condition</span>
                <span
                  className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    evaluatedCondition === 'Good'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {evaluatedCondition}
                </span>
              </div>
            </div>

            {/* 2-Column Numeric Input Split: Good vs Damaged */}
            <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-slate-50 border-slate-100">
              <div>
                <label className="block mb-1 text-xs font-semibold text-emerald-800">
                  Good (Accepted) Units
                </label>
                <input
                  type="number"
                  min="0"
                  max={expectedQty}
                  value={qtyGood}
                  onChange={(e) => setQtyGood(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-emerald-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-900"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-rose-800">
                  Damaged (Defective) Units
                </label>
                <input
                  type="number"
                  min="0"
                  max={expectedQty}
                  value={qtyDamaged}
                  onChange={(e) => setQtyDamaged(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-rose-300 rounded-md focus:ring-2 focus:ring-rose-500 outline-none text-rose-900"
                />
              </div>
            </div>

            {isOverReceived && (
              <p className="text-xs font-medium text-rose-600">
                Warning: Good ({qtyGood}) + Damaged ({qtyDamaged}) totals {totalReceived}, which exceeds the expected {expectedQty} units.
              </p>
            )}

            {/* Receiver & Documentation Inputs */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700">
                  Receiver Name / Badge <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700">
                  Proof of Delivery (POD)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={onFile}
                  className="w-full text-xs cursor-pointer text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
            </div>

            {podDataUrl && podFileName?.endsWith('.pdf') && (
              <div className="overflow-hidden border rounded-lg border-slate-200 max-h-48">
                <PdfViewer dataUrl={podDataUrl} fileName={podFileName} />
              </div>
            )}

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-700">
                Inspection Remarks / Damage Notes
              </label>
              <textarea
                rows={2}
                placeholder={qtyDamaged > 0 ? 'Specify damage details or serial numbers affected...' : 'Intake comments (optional)...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                onClick={() => setSelectedId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isOverReceived || !receivedBy.trim()}
                onClick={submit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md shadow transition-colors cursor-pointer"
              >
                Generate GRN
              </button>
            </div>
          </div>
        ) : (
          <div className="a360-card p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl min-h-[300px]">
            <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-xs font-semibold text-slate-600">No Delivery Selected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select an incoming shipment on the left to verify Good and Damaged units.
            </p>
          </div>
        )}
      </div>

      {/* Historical GRN Table */}
      <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Recent Goods Receipts</h2>
          <span className="text-xs text-slate-400">{goodsReceipts.length} recorded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="font-semibold tracking-wider uppercase border-b bg-slate-50 text-slate-600 border-slate-200">
                <th className="px-4 py-3">GRN #</th>
                <th className="px-4 py-3">Vendor Order</th>
                <th className="px-4 py-3">PO Ref</th>
                <th className="px-4 py-3 text-emerald-700">Good</th>
                <th className="px-4 py-3 text-rose-700">Damaged</th>
                <th className="px-4 py-3">Total Units</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Received By</th>
                <th className="px-4 py-3">Received At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {goodsReceipts.map((g: any) => {
                const good = g.qtyGood ?? (g.condition === 'Good' ? g.quantityReceived : 0);
                const damaged = g.qtyDamaged ?? (g.condition === 'Damaged' ? g.quantityReceived : 0);

                return (
                  <tr key={g.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{g.id}</td>
                    <td className="px-4 py-3 font-medium">{g.vendorOrderId}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{g.poId}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{good}</td>
                    <td className="px-4 py-3 font-bold text-rose-700">{damaged}</td>
                    <td className="px-4 py-3 font-semibold">{g.quantityReceived} / {g.quantityExpected}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.condition} />
                    </td>
                    <td className="px-4 py-3">{g.receivedBy}</td>
                    <td className="px-4 py-3 text-slate-400">{fmt(g.receivedAt)}</td>
                  </tr>
                );
              })}
              {!goodsReceipts.length && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No goods receipts generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}