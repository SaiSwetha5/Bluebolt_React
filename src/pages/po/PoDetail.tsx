import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import PdfViewer from '../../components/ui/PdfViewer';

function fmt(ts: string) { return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

export default function PoDetail() {
  const { id } = useParams<{ id: string }>();
  const { purchaseOrders, catalog, auditFor, approvePO, rejectPO, logAudit } = useData();

  const [showModal, setShowModal] = useState(false);
  const [approverName, setApproverName] = useState('A. Subramanian (Cognizant Lead)');
  const [cognizantHeadEmail, setCognizantHeadEmail] = useState('a.subramanian@cognizant.com');
  const [procurementEmail, setProcurementEmail] = useState('procurement@cognizant.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const po = purchaseOrders.find(p => p.id === id);
  if (!po) return <div className="p-8 text-slate-500">Purchase order not found.</div>;

  const item = catalog.find(c => c.id === po.catalogItemId);
  const audit = auditFor(po.id);

  function openApproveModal() {
    setEmailSubject(`PO Approved: ${po.poNumber} — ${po.clientName}`);
    setEmailBody(`Customer PO ${po.poNumber} (${po.quantity} units) has been approved by ${approverName}.\n\nReady for warehouse inventory fulfillment check and purchase requisition generation.`);
    setShowModal(true);
  }

  function confirmApproval() {
    approvePO(po.id, approverName);
    logAudit('PO_APPROVED', 'PO', po.id, `Approval email sent to Cognizant Head (${cognizantHeadEmail}) and Procurement (${procurementEmail}). Subject: "${emailSubject}"`, approverName);
    setShowModal(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/po" className="text-sm text-slate-500 hover:text-brand-600">← Back to Customer POs</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-slate-900">{po.poNumber}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-slate-500">{po.clientName} · Submitted {fmt(po.submittedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {po.status === 'PENDING_APPROVAL' && (
            <button onClick={openApproveModal} className="a360-btn-primary">Approve & Notify</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="p-5 space-y-4 a360-card">
            <h2 className="text-sm font-semibold text-slate-800">Purchase Order Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><p className="text-slate-400">Client Name</p><p className="text-sm font-semibold text-slate-800">{po.clientName}</p></div>
              <div><p className="text-slate-400">PO Number</p><p className="text-sm font-semibold text-slate-800">{po.poNumber}</p></div>
              <div><p className="text-slate-400">Catalog Item</p><p className="text-sm font-semibold text-slate-800">{item?.name ?? po.catalogItemId}</p></div>
              <div><p className="text-slate-400">Quantity</p><p className="text-sm font-semibold text-slate-800">{po.quantity} units</p></div>
              <div><p className="text-slate-400">Unit Cost / Total</p><p className="text-sm font-semibold text-slate-800">USD {po.unitCost.toLocaleString()} / USD {(po.quantity * po.unitCost).toLocaleString()}</p></div>
              <div><p className="text-slate-400">Source</p><p className="text-sm font-semibold text-slate-800">{po.source}</p></div>
              {po.requestId && <div><p className="text-slate-400">Request ID</p><p className="text-sm font-semibold text-slate-800">{po.requestId}</p></div>}
              {po.notes && <div className="col-span-2"><p className="text-slate-400">Notes / Scope</p><p className="text-slate-700 mt-0.5">{po.notes}</p></div>}
              {po.approvedBy && <div><p className="text-slate-400">Approved By</p><p className="text-sm font-semibold text-slate-800">{po.approvedBy}</p></div>}
              {po.rejectedReason && <div className="col-span-2"><p className="text-slate-400">Rejection Reason</p><p className="text-sm font-semibold text-rose-600">{po.rejectedReason}</p></div>}
            </div>
          </div>

          {po.fileDataUrl && (
            <div className="p-5 a360-card">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Attached Purchase Order Document</h2>
              <PdfViewer dataUrl={po.fileDataUrl} fileName={po.fileName} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-5 space-y-3 a360-card">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400">Audit Trail</h3>
            <div className="space-y-2 text-xs">
              {audit.map(entry => (
                <div key={entry.id} className="pb-2 border-b border-slate-100">
                  <p className="font-medium text-slate-700">{entry.details}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmt(entry.timestamp)} · {entry.actor}</p>
                </div>
              ))}
              {!audit.length && <p className="text-slate-400">No logs for this PO yet.</p>}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 space-y-4 bg-white border shadow-xl rounded-xl border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 font-bold rounded-full bg-emerald-100 text-emerald-600">✓</div>
                <h3 className="text-base font-bold text-slate-800">Approve & Send Notifications</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-lg text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="a360-label">Approver Name</label>
                <input className="a360-input" value={approverName} onChange={e => setApproverName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="a360-label">Cognizant Head Email</label>
                  <input className="a360-input" value={cognizantHeadEmail} onChange={e => setCognizantHeadEmail(e.target.value)} />
                </div>
                <div>
                  <label className="a360-label">Procurement Team Email</label>
                  <input className="a360-input" value={procurementEmail} onChange={e => setProcurementEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="a360-label">Email Subject</label>
                <input className="a360-input" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
              </div>
              <div>
                <label className="a360-label">Email Body & Approval Message</label>
                <textarea className="a360-input" rows={4} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="a360-btn-secondary">Cancel</button>
              <button type="button" onClick={confirmApproval} className="a360-btn-primary bg-emerald-600 hover:bg-emerald-700">Confirm & Send Mail</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
