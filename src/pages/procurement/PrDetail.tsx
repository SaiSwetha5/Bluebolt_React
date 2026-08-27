import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import AuditLogPanel from '../../components/ui/AuditLogPanel';
import PrApprovalEmail from '../../components/ui/PrApprovalEmail';
import Timeline from '../../components/ui/Timeline';
import type { TimelineStep } from '../../components/ui/Timeline';
import { PROCUREMENT_MAILBOX } from '../../types/models';

function fmt(ts?: string) { if (!ts) return '—'; return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

export default function PrDetail() {
  const { id } = useParams<{ id: string }>();
  const { purchaseRequisitions, purchaseOrders, catalog, assets, auditFor, emailPrForApproval, submitPrForApproval, approvePr, rejectPr } = useData();
  const [emailPrId, setEmailPrId] = useState<string | null>(null);

  const pr = purchaseRequisitions.find(p => p.id === id);
  const po = pr ? purchaseOrders.find(p => p.id === pr.poId) : undefined;
  const audit = pr ? auditFor(pr.id) : [];
  const catalogName = pr ? (catalog.find(c => c.id === pr.catalogItemId)?.name ?? pr.catalogItemId) : '—';

  const totalCmdbInStock = useMemo(() => assets.filter(a => a.lifecycleStatus === 'IN_STOCK').length, [assets]);
  const balanceQty = pr ? Math.max(0, pr.requestedQty - totalCmdbInStock) : 0;
  const estimatedTotalCost = pr ? balanceQty * (pr.estimatedUnitCost || 0) : 0;

  const steps = useMemo<TimelineStep[]>(() => {
    if (!pr) return [];
    const order = ['DRAFT','PENDING_APPROVAL','APPROVED','CONVERTED'];
    const idx = order.indexOf(pr.status === 'REJECTED' ? 'PENDING_APPROVAL' : pr.status);
    return [
      { label:'Drafted', timestamp:pr.requestedAt, state: idx >= 0 ? 'done' : 'pending' },
      { label:'Sent for Approval', timestamp:pr.emailedAt, state: pr.status==='REJECTED' ? 'error' : idx>=1?'done':idx===0?'current':'pending' },
      { label:'Approved → Procurement notified', timestamp:pr.approvedAt, state: pr.status==='REJECTED'?'error':idx>=2?'done':idx===1?'current':'pending' },
    ];
  }, [pr]);

  if (!pr) return <div className="text-center text-slate-400 py-16">Purchase requisition not found.</div>;

  function onSendEmail(e: { prId: string; toEmail: string }) {
    emailPrForApproval(e.prId, e.toEmail);
    submitPrForApproval(e.prId);
    setEmailPrId(null);
  }

  function approve() { approvePr(pr.id, 'A. Subramanian (Cognizant)'); }
  function reject() { const reason = prompt('Reason for rejection?') ?? 'Not specified'; rejectPr(pr.id, 'A. Subramanian (Cognizant)', reason); }

  return (
    <div className="space-y-5">
      <div className="no-print flex items-center justify-between">
        <div>
          <Link to="/procurement/requisitions" className="text-sm text-slate-500 hover:text-brand-600">← Back to Purchase Requisitions</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-lg font-bold text-slate-800">{pr.id}</h1>
            <StatusBadge status={pr.status} />
          </div>
          <p className="text-sm text-slate-500">Against Customer PO {pr.poId}{po ? ` · ${po.clientName}` : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => window.print()} className="a360-btn-secondary">Download / Print PDF</button>
          {pr.status === 'DRAFT' && <button onClick={() => setEmailPrId(pr.id)} className="a360-btn-primary">Send for Approval</button>}
          {pr.status === 'PENDING_APPROVAL' && <>
            <button onClick={reject} className="a360-btn-danger">Reject</button>
            <button onClick={approve} className="a360-btn-primary">Approve</button>
          </>}
        </div>
      </div>

      <div className="no-print a360-card p-5"><Timeline steps={steps} /></div>

      {pr.status === 'PENDING_APPROVAL' && (
        <div className="no-print rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">!</span></div>
          <div className="text-sm"><p className="font-semibold text-amber-800">Awaiting approval</p><p className="text-amber-700 mt-0.5">Approval request sent to <strong>{pr.emailedTo}</strong>{pr.emailedAt ? ` on ${fmt(pr.emailedAt)}` : ''}. A notification copy was routed to the procurement mailbox <strong>({PROCUREMENT_MAILBOX})</strong>. Use the <strong>Approve</strong> or <strong>Reject</strong> buttons above to action this requisition.</p></div>
        </div>
      )}
      {pr.status === 'APPROVED' && (
        <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">✓</span></div>
          <div className="text-sm"><p className="font-semibold text-emerald-800">Approved — procurement process triggered</p><p className="text-emerald-700 mt-0.5">Approved by <strong>{pr.approvedBy}</strong>{pr.approvedAt ? ` on ${fmt(pr.approvedAt)}` : ''}. A procurement trigger notification was automatically sent to <strong>{PROCUREMENT_MAILBOX}</strong>. Click <strong>Raise Cognizant PO</strong> to complete the downstream procurement.</p></div>
        </div>
      )}
      {pr.status === 'REJECTED' && (
        <div className="no-print rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">✕</span></div>
          <div className="text-sm"><p className="font-semibold text-rose-800">Rejected</p><p className="text-rose-700 mt-0.5">Rejected by <strong>{pr.approvedBy}</strong>. Reason: {pr.rejectedReason}.</p></div>
        </div>
      )}
      {pr.status === 'CONVERTED' && (
        <div className="no-print rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm">
          <p className="font-semibold text-brand-800">Converted to Cognizant PO</p>
          <p className="text-brand-700 mt-0.5">This requisition has been fully actioned and converted into a vendor order.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="print-area a360-card p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div><p className="text-xs text-slate-400">Cognizant · Asset360</p><h2 className="text-base font-bold text-slate-800">Purchase Requisition {pr.id}</h2></div>
              <StatusBadge status={pr.status} />
            </div>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-slate-400">Customer PO</dt><dd className="font-medium text-slate-800">{pr.poId}{po ? ` (${po.poNumber})` : ''}</dd>
              <dt className="text-slate-400">Client</dt><dd className="font-medium text-slate-800">{po?.clientName ?? '—'}</dd>
              <dt className="text-slate-400">Request ID</dt><dd className="font-medium text-slate-800">{pr.requestId}</dd>
              <dt className="text-slate-400">Catalog Item</dt><dd className="font-medium text-slate-800">{catalogName}</dd>
              <dt className="text-slate-400">Preferred Vendor</dt><dd className="font-medium text-slate-800">{pr.preferredVendor ?? 'Not specified'}</dd>
              <dt className="text-slate-400">Cost Center</dt><dd className="font-medium text-slate-800">{pr.costCenter}</dd>
              <dt className="text-slate-400">Requested By</dt><dd className="font-medium text-slate-800">{pr.requestedBy}</dd>
              <dt className="text-slate-400">Requested At</dt><dd className="font-medium text-slate-800">{fmt(pr.requestedAt)}</dd>
              {pr.emailedTo && <><dt className="text-slate-400">Approval Email Sent To</dt><dd className="font-medium text-slate-800">{pr.emailedTo} ({fmt(pr.emailedAt)})</dd></>}
              {pr.approvedBy && <><dt className="text-slate-400">Approved By</dt><dd className="font-medium text-slate-800">{pr.approvedBy}</dd><dt className="text-slate-400">Approved At</dt><dd className="font-medium text-slate-800">{fmt(pr.approvedAt)}</dd></>}
              {pr.procurementNotificationSentTo && <><dt className="text-slate-400">Procurement Mailbox Notified</dt><dd className="font-medium text-emerald-700">{pr.procurementNotificationSentTo} ({fmt(pr.procurementNotificationSentAt)})</dd></>}
              {pr.rejectedReason && <><dt className="text-slate-400">Rejection Reason</dt><dd className="font-medium text-rose-600">{pr.rejectedReason}</dd></>}
            </dl>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Balance quantity calculation</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-slate-500">Requested</p><p className="font-semibold text-slate-800">{pr.requestedQty}</p></div>
                <div><p className="text-slate-500">In Warehouse</p><p className="font-semibold text-slate-800">{totalCmdbInStock}</p></div>
                <div className="border-l border-slate-200 pl-3"><p className="text-slate-500">Balance</p><p className={`font-bold text-base ${balanceQty===0?'text-emerald-600':'text-brand-700'}`}>{balanceQty}</p></div>
              </div>
              <p className="text-sm text-slate-600 mt-3">Estimated unit cost <span className="font-medium">${pr.estimatedUnitCost.toLocaleString()}</span> × balance {balanceQty} = <span className="font-semibold text-slate-800">${estimatedTotalCost.toLocaleString()}</span> estimated spend.</p>
              {balanceQty===0 && pr.requestedQty>0 && <p className="mt-2 text-xs text-emerald-600 font-medium">✓ Warehouse stock fully covers this request — no vendor order needed.</p>}
              {balanceQty>0 && totalCmdbInStock>0 && <p className="mt-2 text-xs text-brand-600 font-medium">ℹ Partial stock applied: {totalCmdbInStock} available unit(s) deducted from total requisition.</p>}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Justification</p>
              <p className="text-sm text-slate-700">{pr.justification}</p>
            </div>
          </div>
        </div>
        <div className="no-print"><AuditLogPanel entries={audit} /></div>
      </div>

      <PrApprovalEmail prId={emailPrId} onClose={() => setEmailPrId(null)} onSend={onSendEmail} />
    </div>
  );
}
