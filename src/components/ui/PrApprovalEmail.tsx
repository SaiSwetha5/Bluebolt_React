import { useState } from 'react';
import { useData } from '../../store/DataContext';
import { PROCUREMENT_MAILBOX } from '../../types/models';

interface Props {
  prId: string | null;
  onClose: () => void;
  onSend: (args: { prId: string; toEmail: string }) => void;
}

export default function PrApprovalEmail({ prId, onClose, onSend }: Props) {
  const { purchaseRequisitions, purchaseOrders, catalog } = useData();
  const [toEmail, setToEmail] = useState('a.subramanian@cognizant.com');

  if (!prId) return null;
  const pr = purchaseRequisitions.find(p => p.id === prId);
  if (!pr) return null;
  const po = purchaseOrders.find(p => p.id === pr.poId);
  const catalogName = catalog.find(c => c.id === pr.catalogItemId)?.name ?? pr.catalogItemId;

  const subject = `[Action Required] Approve PR ${pr.id} — ${pr.balanceQty} unit(s) to procure, est. $${pr.estimatedTotalCost.toLocaleString()}`;
  const body = [
    `Dear Approver,`, ``,
    `A purchase requisition requires your approval before a Cognizant PO can be raised to a vendor.`, ``,
    `─── Requisition Summary ─────────────────────────────────────`,
    `Requisition ID  : ${pr.id}`,
    `Customer PO     : ${pr.poId}${po ? ' (' + po.clientName + ', their PO# ' + po.poNumber + ')' : ''}`,
    `Catalog item    : ${catalogName}`,
    `Requested by    : ${pr.requestedBy}`,
    `Cost center     : ${pr.costCenter}`, ``,
    `─── Quantity & Cost ─────────────────────────────────────────`,
    `Requested qty   : ${pr.requestedQty}`,
    `In warehouse    : ${pr.inStockQty}`,
    `Already on order: ${pr.onOrderQty}`,
    `Balance to order: ${pr.balanceQty}`, ``,
    `Preferred vendor: ${pr.preferredVendor ?? 'Not specified'}`,
    `Est. unit cost  : $${pr.estimatedUnitCost.toLocaleString()}`,
    `Est. total spend: $${pr.estimatedTotalCost.toLocaleString()}`, ``,
    `─── Justification ───────────────────────────────────────────`,
    pr.justification, ``,
    `─────────────────────────────────────────────────────────────`,
    `Please log in to Asset360 and navigate to:`,
    `  Procurement → Purchase Requisitions → ${pr.id}`,
    `to Approve or Reject this requisition.`, ``,
    `Upon approval, a procurement trigger notification will be automatically`,
    `sent to the procurement mailbox (${PROCUREMENT_MAILBOX}) to action the Cognizant PO.`, ``,
    `This email was generated automatically by Asset360.`,
    `CC: ${PROCUREMENT_MAILBOX} (Procurement Mailbox)`,
  ].join('\n');

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PR Approval Workflow</p>
          <h2 className="text-lg font-bold text-slate-800">Send {pr.id} for approval</h2>
          <p className="text-sm text-slate-500 mt-1">The approval request is emailed to the nominated approver. A notification copy is automatically routed to the <span className="font-medium text-brand-700">procurement mailbox ({PROCUREMENT_MAILBOX})</span> and recorded in the audit trail.</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="a360-label">To (Approver)</label>
            <input className="a360-input" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="approver@cognizant.com" />
          </div>
          <div>
            <label className="a360-label">CC (Procurement Mailbox — automatic)</label>
            <input className="a360-input bg-slate-50 text-slate-500" value={PROCUREMENT_MAILBOX} readOnly />
          </div>
          <div>
            <label className="a360-label">Subject</label>
            <input className="a360-input" value={subject} readOnly />
          </div>
          <div>
            <label className="a360-label">Body</label>
            <textarea className="a360-input font-mono text-xs" rows={12} value={body} readOnly />
          </div>
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700 space-y-1">
            <p className="font-semibold">What happens when you send:</p>
            <p>1. Approval request emailed to <strong>{toEmail || 'the approver'}</strong>.</p>
            <p>2. Notification copy routed to <strong>{PROCUREMENT_MAILBOX}</strong>.</p>
            <p>3. PR status moves to <strong>Pending Approval</strong>.</p>
            <p>4. Both events are recorded in the audit trail.</p>
            <p>5. Once approved, a procurement trigger notification is automatically sent to the procurement mailbox.</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button className="a360-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="a360-btn-primary" disabled={!toEmail} onClick={() => onSend({ prId: pr.id, toEmail })}>Send for approval</button>
        </div>
      </div>
    </div>
  );
}
