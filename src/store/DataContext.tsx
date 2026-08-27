import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type {
  PurchaseOrder, PurchaseRequisition, VendorOrder, GoodsReceipt, VendorInvoice,
  LeaseSchedule, AssetRecord, AuditLogEntry, CatalogItem, AuditAction,
  VendorName, ShipmentStatus, PrStatus, ModelCategory, PrNotification, ServiceClass, ReportingHierarchy
} from '../types/models';
import { PROCUREMENT_MAILBOX } from '../types/models';

function pad(n: number, len = 5): string { return n.toString().padStart(len, '0'); }

export interface DataContextValue {
  purchaseOrders: PurchaseOrder[]; purchaseRequisitions: PurchaseRequisition[];
  vendorOrders: VendorOrder[]; goodsReceipts: GoodsReceipt[];
  invoices: VendorInvoice[]; leaseSchedules: LeaseSchedule[];
  assets: AssetRecord[]; auditLog: AuditLogEntry[]; catalog: CatalogItem[];
  notifications: PrNotification[];
  dashboardStats: {
    totalPOs: number; pendingApproval: number; approved: number;
    inProcurement: number; inTransit: number; delivered: number;
    invoiceExceptions: number; totalAssets: number; deployedAssets: number;
    totalDevicesRequested: number; pendingPrApprovals: number; unreadNotifications: number;
  };
  auditFor: (id: string) => AuditLogEntry[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  intakePO: (input: Omit<PurchaseOrder,'id'|'status'|'submittedAt'>) => PurchaseOrder;
  approvePO: (id: string, approver: string) => void;
  rejectPO: (id: string, approver: string, reason: string) => void;
  logAudit: (action: AuditAction, entityType: AuditLogEntry['entityType'], entityId: string, details: string, actor?: string) => void;
  availableWarehouseStock: (catalogItemId: string) => number;
  onOrderQuantity: (catalogItemId: string) => number;
  fulfillFromWarehouse: (poId: string, catalogItemId: string, qty: number) => number;
  createPurchaseRequisition: (input: { poId: string; requestedQty: number; preferredVendor?: VendorName; estimatedUnitCost: number; costCenter: string; justification: string; requestedBy: string }) => PurchaseRequisition;
  submitPrForApproval: (prId: string) => void;
  emailPrForApproval: (prId: string, approverEmail: string) => void;
  approvePr: (prId: string, approver: string) => void;
  rejectPr: (prId: string, approver: string, reason: string) => void;
  markPrConverted: (prId: string) => void;
  createVendorOrder: (input: { poId: string; requestId: string; prId?: string; vendor: VendorName; vendorSku: string; channel: VendorOrder['channel']; quantity: number; unitCost: number; destination: VendorOrder['destination']; modelCategory?: ModelCategory; currentGeneration?: string; sku1NonModern?: string; newGeneration?: string; catalogItemId: string; warehouseAddress?: string; cognizantPoOverride?: string }) => VendorOrder;
  submitVendorOrder: (voId: string) => void;
  advanceVendorOrderStatus: (voId: string, status: VendorOrder['status'], extra?: Partial<VendorOrder>) => void;
  addShipmentEvent: (voId: string, status: ShipmentStatus, location?: string, note?: string) => void;
  createGoodsReceipt: (input: Omit<GoodsReceipt,'id'|'receivedAt'>) => GoodsReceipt;
  submitInvoice: (input: Omit<VendorInvoice,'id'|'status'|'matchResult'>) => VendorInvoice;
  approveInvoicePayment: (invoiceId: string, approver: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  createLeaseSchedule: (input: Omit<LeaseSchedule,'id'|'status'>) => LeaseSchedule;
  assignAsset: (assetId: string, user: string, location: string) => void;
  retireAsset: (assetId: string) => void;
  upsertCatalogItem: (item: CatalogItem, isNew: boolean) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const counters = useRef({ po: 417, req: 900, vo: 118, grn: 212, inv: 8821, ls: 41, ast: 451, audit: 1, pr: 301, notif: 1 });
  const [purchaseOrders, setPOs] = useState<PurchaseOrder[]>([]);
  const [purchaseRequisitions, setPRs] = useState<PurchaseRequisition[]>([]);
  const [vendorOrders, setVOs] = useState<VendorOrder[]>([]);
  const [goodsReceipts, setGRNs] = useState<GoodsReceipt[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [leaseSchedules, setLeases] = useState<LeaseSchedule[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [notifications, setNotifications] = useState<PrNotification[]>([]);

  // refs to avoid stale closures in seed
  const posRef = useRef<PurchaseOrder[]>([]);
  const prsRef = useRef<PurchaseRequisition[]>([]);
  const vosRef = useRef<VendorOrder[]>([]);
  const assetsRef = useRef<AssetRecord[]>([]);
  const invoicesRef = useRef<VendorInvoice[]>([]);
  const auditRef = useRef<AuditLogEntry[]>([]);
  const catalogRef = useRef<CatalogItem[]>([]);

  const setPOs2 = (fn: (l: PurchaseOrder[]) => PurchaseOrder[]) => { const n = fn(posRef.current); posRef.current = n; setPOs(n); };
  const setPRs2 = (fn: (l: PurchaseRequisition[]) => PurchaseRequisition[]) => { const n = fn(prsRef.current); prsRef.current = n; setPRs(n); };
  const setVOs2 = (fn: (l: VendorOrder[]) => VendorOrder[]) => { const n = fn(vosRef.current); vosRef.current = n; setVOs(n); };
  const setAssets2 = (fn: (l: AssetRecord[]) => AssetRecord[]) => { const n = fn(assetsRef.current); assetsRef.current = n; setAssets(n); };
  const setInvoices2 = (fn: (l: VendorInvoice[]) => VendorInvoice[]) => { const n = fn(invoicesRef.current); invoicesRef.current = n; setInvoices(n); };

  const logAudit = useCallback((action: AuditAction, entityType: AuditLogEntry['entityType'], entityId: string, details: string, actor = 'system') => {
    const entry: AuditLogEntry = { id: 'AUD-' + pad(counters.current.audit++), timestamp: new Date().toISOString(), action, entityType, entityId, actor, details };
    auditRef.current = [entry, ...auditRef.current];
    setAuditLog([...auditRef.current]);
  }, []);

  const pushNotification = useCallback((n: Omit<PrNotification,'id'|'timestamp'|'read'>) => {
    const notif: PrNotification = { ...n, id: 'NOTIF-' + pad(counters.current.notif++), timestamp: new Date().toISOString(), read: false };
    setNotifications(l => [notif, ...l]);
  }, []);

  const markNotificationRead = useCallback((id: string) => setNotifications(l => l.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllNotificationsRead = useCallback(() => setNotifications(l => l.map(n => ({ ...n, read: true }))), []);
  const auditFor = useCallback((entityId: string) => auditRef.current.filter(a => a.entityId === entityId), []);

  // PO
  function acknowledgePO(poId: string) {
    const requestId = 'REQ-2026-' + pad(counters.current.req++);
    setPOs2(list => list.map(p => p.id === poId ? { ...p, status: 'ACKNOWLEDGED', requestId, acknowledgedAt: new Date().toISOString() } : p));
    logAudit('PO_ACKNOWLEDGED', 'PO', poId, `Acknowledgment sent to client. Request ${requestId} generated.`);
    setPOs2(list => list.map(p => p.id === poId ? { ...p, status: 'PENDING_APPROVAL' } : p));
  }

  const intakePO = useCallback((input: Omit<PurchaseOrder,'id'|'status'|'submittedAt'>): PurchaseOrder => {
    const po: PurchaseOrder = { ...input, id: 'PO-2026-' + pad(counters.current.po++), status: 'RECEIVED', submittedAt: new Date().toISOString() };
    setPOs2(l => [po, ...l]);
    logAudit('PO_RECEIVED', 'PO', po.id, `PO ${po.poNumber} received from ${po.clientName} for ${po.quantity} units via ${po.source === 'PDF_IMPORT' ? 'PDF import' : 'API integration'}.`);
    setTimeout(() => acknowledgePO(po.id), 0);
    return po;
  }, [logAudit]);

  const approvePO = useCallback((poId: string, approver: string) => {
    setPOs2(l => l.map(p => p.id === poId ? { ...p, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedBy: approver } : p));
    logAudit('PO_APPROVED', 'PO', poId, `PO approved by ${approver}. Routed to warehouse for fulfillment instructions.`, approver);
  }, [logAudit]);

  const rejectPO = useCallback((poId: string, approver: string, reason: string) => {
    setPOs2(l => l.map(p => p.id === poId ? { ...p, status: 'REJECTED', rejectedReason: reason } : p));
    logAudit('PO_REJECTED', 'PO', poId, `PO rejected by ${approver}. Reason: ${reason}`, approver);
  }, [logAudit]);

  const availableWarehouseStock = useCallback((catalogItemId: string) =>
    assetsRef.current.filter(a => a.catalogItemId === catalogItemId && a.lifecycleStatus === 'IN_STOCK' && a.location === 'Cognizant Warehouse').length, []);

  const onOrderQuantity = useCallback((catalogItemId: string) => {
    const poCatalogById = new Map(posRef.current.map(p => [p.id, p.catalogItemId]));
    return vosRef.current.filter(v => poCatalogById.get(v.poId) === catalogItemId && v.status !== 'DELIVERED' && v.status !== 'CANCELLED').reduce((s, v) => s + v.quantity, 0);
  }, []);

  const fulfillFromWarehouse = useCallback((poId: string, catalogItemId: string, qty: number) => {
    const candidates = assetsRef.current.filter(a => a.catalogItemId === catalogItemId && a.lifecycleStatus === 'IN_STOCK' && a.location === 'Cognizant Warehouse').slice(0, qty);
    if (!candidates.length) return 0;
    const ids = new Set(candidates.map(a => a.assetId));
    setAssets2(l => l.map(a => ids.has(a.assetId) ? { ...a, poId } : a));
    logAudit('ASSET_ASSIGNED', 'Asset', candidates.map(a => a.assetId).join(', '), `${candidates.length} unit(s) reassigned from warehouse stock to fulfill ${poId}.`);
    return candidates.length;
  }, [logAudit]);

  const createPurchaseRequisition = useCallback((input: { poId: string; requestedQty: number; preferredVendor?: VendorName; estimatedUnitCost: number; costCenter: string; justification: string; requestedBy: string }): PurchaseRequisition => {
    const po = posRef.current.find(p => p.id === input.poId);
    if (!po) throw new Error('Customer PO not found for requisition.');
    const requestId = po.requestId || ('REQ-2026-' + pad(counters.current.req++));
    if (!po.requestId) setPOs2(l => l.map(p => p.id === po.id ? { ...p, requestId } : p));
    const inStockQty = assetsRef.current.filter(a => a.catalogItemId === po.catalogItemId && a.lifecycleStatus === 'IN_STOCK' && a.location === 'Cognizant Warehouse').length;
    const poCatalogById = new Map(posRef.current.map(p => [p.id, p.catalogItemId]));
    const onOrderQty = vosRef.current.filter(v => poCatalogById.get(v.poId) === po.catalogItemId && v.status !== 'DELIVERED' && v.status !== 'CANCELLED').reduce((s, v) => s + v.quantity, 0);
    const balanceQty = Math.max(input.requestedQty - inStockQty - onOrderQty, 0);
    const pr: PurchaseRequisition = {
      id: 'PR-2026-' + pad(counters.current.pr++), poId: po.id, requestId, catalogItemId: po.catalogItemId,
      requestedQty: input.requestedQty, inStockQty, onOrderQty, balanceQty,
      preferredVendor: input.preferredVendor, estimatedUnitCost: input.estimatedUnitCost,
      estimatedTotalCost: balanceQty * input.estimatedUnitCost, costCenter: input.costCenter,
      justification: input.justification, requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(), status: 'DRAFT'
    };
    setPRs2(l => [pr, ...l]);
    logAudit('PR_CREATED', 'PR', pr.id, `Requisition raised for ${pr.requestedQty} unit(s) against ${po.id}. In stock: ${inStockQty}, on order: ${onOrderQty}, balance to procure: ${balanceQty}.`, input.requestedBy);
    return pr;
  }, [logAudit]);

  const submitPrForApproval = useCallback((prId: string) => {
    setPRs2(l => l.map(pr => pr.id === prId ? { ...pr, status: 'PENDING_APPROVAL' as PrStatus } : pr));
    logAudit('PR_SUBMITTED_FOR_APPROVAL', 'PR', prId, 'Requisition submitted for approval.');
  }, [logAudit]);

  const emailPrForApproval = useCallback((prId: string, approverEmail: string) => {
    const now = new Date().toISOString();
    setPRs2(l => l.map(pr => pr.id === prId ? { ...pr, emailedTo: approverEmail, emailedAt: now, approvalNotificationSentTo: PROCUREMENT_MAILBOX, approvalNotificationSentAt: now } : pr));
    logAudit('PR_EMAILED', 'PR', prId, `Approval request emailed to ${approverEmail}.`);
    logAudit('PR_APPROVAL_NOTIFICATION_SENT', 'PR', prId, `Approval notification copy routed to procurement mailbox (${PROCUREMENT_MAILBOX}).`);
    const pr = prsRef.current.find(p => p.id === prId);
    if (pr) pushNotification({ type: 'APPROVAL_REQUESTED', prId, subject: `Approval needed: ${prId} — ${pr.balanceQty} unit(s) to procure`, body: `${pr.requestedBy} submitted ${prId} for approval. Estimated spend: $${pr.estimatedTotalCost.toLocaleString()}. Approver notified: ${approverEmail}.`, to: PROCUREMENT_MAILBOX });
  }, [logAudit, pushNotification]);

  const approvePr = useCallback((prId: string, approver: string) => {
    const now = new Date().toISOString();
    setPRs2(l => l.map(pr => pr.id === prId ? { ...pr, status: 'APPROVED' as PrStatus, approvedBy: approver, approvedAt: now, procurementNotificationSentTo: PROCUREMENT_MAILBOX, procurementNotificationSentAt: now } : pr));
    const pr = prsRef.current.find(p => p.id === prId);
    const po = pr ? posRef.current.find(p => p.id === pr.poId) : undefined;
    if (po && po.status !== 'APPROVED') {
      setPOs2(l => l.map(p => p.id === po.id ? { ...p, status: 'APPROVED', approvedAt: now, approvedBy: approver } : p));
      logAudit('PO_APPROVED', 'PO', po.id, `Customer PO status updated to APPROVED following PR ${prId} approval by ${approver}.`, approver);
    }
    const catalogItem = pr ? catalogRef.current.find(c => c.id === pr.catalogItemId) : undefined;
    logAudit('PR_APPROVED', 'PR', prId, `Requisition approved by ${approver}. Balance qty: ${pr?.balanceQty ?? '?'}, estimated spend: $${pr?.estimatedTotalCost?.toLocaleString() ?? '?'}.`, approver);
    logAudit('PR_PROCUREMENT_NOTIFICATION_SENT', 'PR', prId, `Approval confirmation and procurement trigger routed to ${PROCUREMENT_MAILBOX}.`);
    if (pr) pushNotification({
      type: 'PR_APPROVED', prId, subject: `PR Approved — raise Cognizant PO for ${prId}`,
      body: [`${prId} was approved by ${approver}.`, ``, `Customer PO: ${pr.poId}${po ? ' (' + po.clientName + ', PO# ' + po.poNumber + ')' : ''}`, `Catalog item: ${catalogItem?.name ?? pr.catalogItemId}`, `Balance quantity to procure: ${pr.balanceQty}`, `Preferred vendor: ${pr.preferredVendor ?? 'Not specified'}`, `Estimated unit cost: $${pr.estimatedUnitCost.toLocaleString()}`, `Estimated total spend: $${pr.estimatedTotalCost.toLocaleString()}`, `Cost center: ${pr.costCenter}`, ``, `Action required: raise a Cognizant PO against this approved requisition in Asset360.`].join('\n'),
      to: PROCUREMENT_MAILBOX
    });
  }, [logAudit, pushNotification]);

  const rejectPr = useCallback((prId: string, approver: string, reason: string) => {
    setPRs2(l => l.map(pr => pr.id === prId ? { ...pr, status: 'REJECTED' as PrStatus, approvedBy: approver, rejectedReason: reason } : pr));
    logAudit('PR_REJECTED', 'PR', prId, `Requisition rejected by ${approver}. Reason: ${reason}`, approver);
    const pr = prsRef.current.find(p => p.id === prId);
    if (pr) pushNotification({ type: 'PR_REJECTED', prId, subject: `PR Rejected — ${prId}`, body: `${prId} was rejected by ${approver}. Reason: ${reason}. Requested by: ${pr.requestedBy}.`, to: PROCUREMENT_MAILBOX });
  }, [logAudit, pushNotification]);

  const markPrConverted = useCallback((prId: string) => {
    setPRs2(l => l.map(pr => pr.id === prId ? { ...pr, status: 'CONVERTED' as PrStatus } : pr));
    logAudit('PR_CONVERTED', 'PR', prId, 'Requisition converted into a Cognizant PO / vendor order.');
  }, [logAudit]);

  const createVendorOrder = useCallback((input: { poId: string; requestId: string; prId?: string; vendor: VendorName; vendorSku: string; channel: VendorOrder['channel']; quantity: number; unitCost: number; destination: VendorOrder['destination']; modelCategory?: ModelCategory; currentGeneration?: string; sku1NonModern?: string; newGeneration?: string; catalogItemId: string; warehouseAddress?: string; cognizantPoOverride?: string }): VendorOrder => {
    const n = counters.current.vo++;
    const { cognizantPoOverride, ...rest } = input;
    const vo: VendorOrder = { ...rest, id: 'VO-2026-' + pad(n), cognizantPoNumber: cognizantPoOverride?.trim() || 'CGZ-PO-2026-' + pad(n), status: 'DRAFT', createdAt: new Date().toISOString(), shipmentHistory: [] };
    setVOs2(l => [vo, ...l]);
    logAudit('VENDOR_ORDER_CREATED', 'VendorOrder', vo.id, `Cognizant PO ${vo.cognizantPoNumber} drafted with ${vo.vendor} for ${vo.quantity} units (SKU ${vo.vendorSku}) via ${vo.channel}, fulfilling customer PO ${vo.poId}${vo.prId ? ` (requisition ${vo.prId})` : ''}.`);
    return vo;
  }, [logAudit]);

  const submitVendorOrder = useCallback((voId: string) => {
    setVOs2(l => l.map(v => v.id === voId ? { ...v, status: 'SUBMITTED', submittedAt: new Date().toISOString() } : v));
    logAudit('VENDOR_ORDER_SUBMITTED', 'VendorOrder', voId, 'Order submitted to vendor procurement channel.');
  }, [logAudit]);

  const advanceVendorOrderStatus = useCallback((voId: string, status: VendorOrder['status'], extra?: Partial<VendorOrder>) => {
    setVOs2(l => l.map(v => v.id === voId ? { ...v, status, ...extra } : v));
    logAudit('VENDOR_ORDER_STATUS_CHANGED', 'VendorOrder', voId, `Status changed to ${status}.`);
  }, [logAudit]);

  const addShipmentEvent = useCallback((voId: string, status: ShipmentStatus, location?: string, note?: string) => {
    setVOs2(l => l.map(v => v.id === voId ? { ...v, shipmentStatus: status, shipmentHistory: [...v.shipmentHistory, { status, timestamp: new Date().toISOString(), location, note }], status: status === 'DELIVERED' ? 'DELIVERED' : (status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY') ? 'SHIPPED' : v.status } : v));
    logAudit('SHIPMENT_UPDATE', 'VendorOrder', voId, `Shipment status: ${status}${location ? ' @ ' + location : ''}.`);
  }, [logAudit]);

  const createGoodsReceipt = useCallback((input: Omit<GoodsReceipt,'id'|'receivedAt'>): GoodsReceipt => {
    const grn: GoodsReceipt = { ...input, id: 'GRN-2026-' + pad(counters.current.grn++), receivedAt: new Date().toISOString() };
    setGRNs(l => [grn, ...l]);
    logAudit('POD_CAPTURED', 'GRN', grn.id, `Proof of delivery captured (${grn.podFileName ?? 'no file'}).`);
    logAudit('GRN_GENERATED', 'GRN', grn.id, `GRN generated for vendor order ${grn.vendorOrderId}: ${grn.quantityReceived}/${grn.quantityExpected} units, condition ${grn.condition}.`);
    const vo = vosRef.current.find(v => v.id === grn.vendorOrderId);
    const po = posRef.current.find(p => p.id === grn.poId);
    const item = po ? catalogRef.current.find(c => c.id === po.catalogItemId) : undefined;
    const mapping = item?.vendorMappings.find(m => vo && m.vendor === vo.vendor);
    if (vo && po) {
      const newAssets: AssetRecord[] = Array.from({ length: grn.quantityReceived }).map(() => ({
        assetId: 'AST-' + pad(counters.current.ast++, 6),
        serialNumber: 'SN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        deviceType: 'Laptop' as const, vendor: vo.vendor,
        model: mapping?.newGenModel ?? mapping?.currentGenModel ?? item?.name ?? 'Unknown Model',
        catalogItemId: po.catalogItemId, cost: vo.unitCost,
        location: 'Cognizant Warehouse', shipmentStatus: 'DELIVERED' as const,
        lifecycleStatus: 'IN_STOCK' as const, poId: po.id, vendorOrderId: vo.id, grnId: grn.id
      }));
      setAssets2(l => [...newAssets, ...l]);
      newAssets.forEach(a => logAudit('ASSET_CREATED', 'Asset', a.assetId, `Asset registered in CMDB from GRN ${grn.id}.`));
    }
    return grn;
  }, [logAudit]);

  const submitInvoice = useCallback((input: Omit<VendorInvoice,'id'|'status'|'matchResult'>): VendorInvoice => {
    const grn = input.grnId ? goodsReceipts.find(g => g.id === input.grnId) : undefined;
    // use ref for GRNs to get fresh data
    const po = posRef.current.find(p => p.id === input.poId);
    const poMatch = !!po; const podMatch = !!grn?.podDataUrl || !!grn?.podFileName; const grnMatch = !!grn;
    const status: VendorInvoice['status'] = (poMatch && podMatch && grnMatch) ? 'MATCHED' : 'EXCEPTION';
    const invoice: VendorInvoice = { ...input, id: 'INV-' + input.vendor.toUpperCase() + '-' + pad(counters.current.inv++, 5), status, matchResult: { poMatch, podMatch, grnMatch, variance: status === 'EXCEPTION' ? 'Missing supporting document(s) for 3-way match.' : undefined } };
    setInvoices2(l => [invoice, ...l]);
    logAudit('INVOICE_SUBMITTED', 'Invoice', invoice.id, `${invoice.vendor} invoice submitted for ${invoice.amount.toLocaleString()} against ${invoice.poId}.`);
    logAudit(status === 'MATCHED' ? 'INVOICE_MATCHED' : 'INVOICE_EXCEPTION', 'Invoice', invoice.id, status === 'MATCHED' ? '3-way match successful (PO / POD / GRN).' : 'Exception raised during 3-way match validation.');
    return invoice;
  }, [goodsReceipts, logAudit]);

  const approveInvoicePayment = useCallback((invoiceId: string, approver: string) => {
    setInvoices2(l => l.map(i => i.id === invoiceId ? { ...i, status: 'APPROVED_FOR_PAYMENT' } : i));
    logAudit('PAYMENT_APPROVED', 'Invoice', invoiceId, `Payment approved by ${approver}.`, approver);
  }, [logAudit]);

  const markInvoicePaid = useCallback((invoiceId: string) => setInvoices2(l => l.map(i => i.id === invoiceId ? { ...i, status: 'PAID' } : i)), []);

  const createLeaseSchedule = useCallback((input: Omit<LeaseSchedule,'id'|'status'>): LeaseSchedule => {
    const ls: LeaseSchedule = { ...input, id: 'LS-' + input.vendor.toUpperCase() + '-2026-' + pad(counters.current.ls++, 3), status: 'PENDING' };
    setLeases(l => [ls, ...l]);
    setInvoices2(l => l.map(i => i.id === input.invoiceId ? { ...i, leaseScheduleId: ls.id } : i));
    logAudit('LEASE_SCHEDULE_CREATED', 'Lease', ls.id, `Lease schedule created: ${ls.termMonths} months @ ${ls.monthlyPayment}/mo.`);
    const invoice = invoicesRef.current.find(i => i.id === input.invoiceId);
    if (invoice) setAssets2(l => l.map(a => a.poId === invoice.poId ? { ...a, leaseStartDate: ls.startDate, leaseEndDate: ls.endDate, contract: ls.id } : a));
    return ls;
  }, [logAudit]);

  const assignAsset = useCallback((assetId: string, user: string, location: string) => {
    setAssets2(l => l.map(a => a.assetId === assetId ? { ...a, assignedUser: user, location, lifecycleStatus: 'DEPLOYED' } : a));
    logAudit('ASSET_ASSIGNED', 'Asset', assetId, `Assigned to ${user} at ${location}.`);
  }, [logAudit]);

  const retireAsset = useCallback((assetId: string) => {
    setAssets2(l => l.map(a => a.assetId === assetId ? { ...a, lifecycleStatus: 'RETIRED' } : a));
    logAudit('ASSET_RETIRED', 'Asset', assetId, 'Asset retired from active service.');
  }, [logAudit]);

  const upsertCatalogItem = useCallback((item: CatalogItem, isNew: boolean) => {
    if (isNew) { catalogRef.current = [item, ...catalogRef.current]; } else { catalogRef.current = catalogRef.current.map(c => c.id === item.id ? item : c); }
    setCatalog([...catalogRef.current]);
    logAudit(isNew ? 'CATALOG_ITEM_CREATED' : 'CATALOG_ITEM_UPDATED', 'Catalog', item.id, item.name);
  }, [logAudit]);

  // Seed
  useEffect(() => {
    function intakePOSeed(input: Omit<PurchaseOrder,'id'|'status'|'submittedAt'>): PurchaseOrder {
      const po: PurchaseOrder = { ...input, id: 'PO-2026-' + pad(counters.current.po++), status: 'RECEIVED', submittedAt: new Date().toISOString() };
      posRef.current = [po, ...posRef.current];
      setPOs([...posRef.current]);
      auditRef.current = [{ id: 'AUD-' + pad(counters.current.audit++), timestamp: new Date().toISOString(), action: 'PO_RECEIVED', entityType: 'PO', entityId: po.id, actor: 'system', details: `PO ${po.poNumber} received from ${po.clientName} for ${po.quantity} units.` }, ...auditRef.current];
      setAuditLog([...auditRef.current]);
      // acknowledge inline
      const requestId = 'REQ-2026-' + pad(counters.current.req++);
      posRef.current = posRef.current.map(p => p.id === po.id ? { ...p, status: 'PENDING_APPROVAL', requestId, acknowledgedAt: new Date().toISOString() } : p);
      setPOs([...posRef.current]);
      auditRef.current = [{ id: 'AUD-' + pad(counters.current.audit++), timestamp: new Date().toISOString(), action: 'PO_ACKNOWLEDGED', entityType: 'PO', entityId: po.id, actor: 'system', details: `Acknowledgment sent. Request ${requestId} generated.` }, ...auditRef.current];
      setAuditLog([...auditRef.current]);
      return posRef.current.find(p => p.id === po.id)!;
    }

    function approvePOSeed(poId: string, approver: string) {
      posRef.current = posRef.current.map(p => p.id === poId ? { ...p, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedBy: approver } : p);
      setPOs([...posRef.current]);
    }

    function createVOSeed(input: Parameters<typeof createVendorOrder>[0]): VendorOrder {
      const n = counters.current.vo++;
      const { cognizantPoOverride, ...rest } = input;
      const vo: VendorOrder = { ...rest, id: 'VO-2026-' + pad(n), cognizantPoNumber: cognizantPoOverride?.trim() || 'CGZ-PO-2026-' + pad(n), status: 'DRAFT', createdAt: new Date().toISOString(), shipmentHistory: [] };
      vosRef.current = [vo, ...vosRef.current]; setVOs([...vosRef.current]); return vo;
    }

    function addEventSeed(voId: string, status: ShipmentStatus, location?: string) {
      vosRef.current = vosRef.current.map(v => v.id === voId ? { ...v, shipmentStatus: status, shipmentHistory: [...v.shipmentHistory, { status, timestamp: new Date().toISOString(), location }], status: status === 'DELIVERED' ? 'DELIVERED' as const : (status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY') ? 'SHIPPED' as const : v.status } : v);
      setVOs([...vosRef.current]);
    }

    function createGRNSeed(input: Omit<GoodsReceipt,'id'|'receivedAt'>): GoodsReceipt {
      const grn: GoodsReceipt = { ...input, id: 'GRN-2026-' + pad(counters.current.grn++), receivedAt: new Date().toISOString() };
      const vo = vosRef.current.find(v => v.id === grn.vendorOrderId);
      const po = posRef.current.find(p => p.id === grn.poId);
      const item = po ? catalogRef.current.find(c => c.id === po.catalogItemId) : undefined;
      const mapping = item?.vendorMappings.find(m => vo && m.vendor === vo.vendor);
      if (vo && po) {
        const newAssets: AssetRecord[] = Array.from({ length: grn.quantityReceived }).map(() => ({ assetId: 'AST-' + pad(counters.current.ast++, 6), serialNumber: 'SN' + Math.random().toString(36).slice(2, 10).toUpperCase(), deviceType: 'Laptop' as const, vendor: vo.vendor, model: mapping?.newGenModel ?? item?.name ?? 'Unknown', catalogItemId: po.catalogItemId, cost: vo.unitCost, location: 'Cognizant Warehouse', shipmentStatus: 'DELIVERED' as const, lifecycleStatus: 'IN_STOCK' as const, poId: po.id, vendorOrderId: vo.id, grnId: grn.id }));
        assetsRef.current = [...newAssets, ...assetsRef.current]; setAssets([...assetsRef.current]);
      }
      setGRNs(l => [grn, ...l]); return grn;
    }

    // --- catalog ---
    const catalog: CatalogItem[] = [
      { id:'CAT-14STD', category:'HW - DaaS Laptop', name:'DaaS Laptop - 14 inch Standard, touch, 16 GB RAM, 1 TB SSD, U5', screenSize:'14"', touch:true, ramGb:16, storageGb:1000, cpu:'Intel Core Ultra 5 (U5)', clientListPrice:1699, active:true, region:'APAC', country:'India', clientCategory:'Notebooks & Laptops', persona:'Standard Office Worker', shopDescription:'HP EliteBook 8 G1i 14 AI — 16GB RAM, 1TB SSD, U5', longDescription:'14 inch display: touch: 16 GB RAM, 1 TB SSD, U5', detailedDescription:'Standard delivery time: 10–15 business days from approval.', modelCategory:'14" Standard Notebook', currentGenModel:'HP EliteBook 8 G1i 14 AI', currentGenSku:'C40DKEC', currentGenConfigDetails:'14 inch display: touch: 16 GB RAM, 1 TB SSD, U5', newGenModel:'HP EliteBook 8 G2i 14 inch', newGenSku:'WIP', newGenConfigDetails:'14 inch display: touch: 16 GB RAM, 1 TB SSD, U5', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Laptops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP EliteBook 8 G1i 14 AI', currentGenSku:'C40DKEC', currentGenType:'Non-Modern', newGenModel:'HP EliteBook 8 G2i 14 inch', npiDate:'NPI September 2027', unitCost:1420 }] },
      { id:'CAT-16STD', category:'HW - DaaS Laptop', name:'DaaS Laptop - 16 inch Standard, touch, 16 GB RAM, 1 TB SSD, U5', screenSize:'16"', touch:true, ramGb:16, storageGb:1000, cpu:'Intel Core Ultra 5 (U5)', clientListPrice:1799, active:true, region:'APAC', country:'India', clientCategory:'Notebooks & Laptops', persona:'Standard Office Worker', shopDescription:'HP EliteBook 8 G1i 16 AI — 16GB RAM, 1TB SSD, U5', longDescription:'15 inch display: touch: 16 GB RAM, 1 TB SSD, U5', detailedDescription:'Standard delivery time: 10–15 business days from approval.', modelCategory:'16" Standard Notebook', currentGenModel:'HP EliteBook 8 G1i 16 AI', currentGenSku:'C3WY0EC', currentGenConfigDetails:'15 inch display: touch: 16 GB RAM, 1 TB SSD, U5', newGenModel:'HP EliteBook 8 G2i 16 inch', newGenSku:'WIP', newGenConfigDetails:'15 inch display: touch: 16 GB RAM, 1 TB SSD, U5', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Laptops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP EliteBook 8 G1i 16 AI', currentGenSku:'C3WY0EC', currentGenType:'Non-Modern', newGenModel:'HP EliteBook 8 G2i 16 inch', npiDate:'NPI September 2027', unitCost:1550 }] },
      { id:'CAT-ULTRA', category:'HW - DaaS Laptop', name:'DaaS Laptop - Ultralight, UMA i5, 1 TB SSD, 16 GB RAM, No WWAN', screenSize:'13"', touch:false, ramGb:16, storageGb:1000, cpu:'Intel Core Ultra 5 (UMA)', clientListPrice:1599, active:true, region:'APAC', country:'India', clientCategory:'Notebooks & Laptops', persona:'Field Technician', shopDescription:'HP EliteBook Ultra G1i AI — UMA i5, 1TB SSD, 16GB RAM, No WWAN', longDescription:'UMA i5 + 1 TB SSD + 16 GB RAM + No WWAN', detailedDescription:'Standard delivery time: 10–15 business days from approval.', modelCategory:'"Ultralight" Notebook', currentGenModel:'HP EliteBook Ultra G1i AI', currentGenSku:'C61MVEC', currentGenConfigDetails:'UMA i5 + 1 TB SSD + 16 GB RAM + No WWAN', newGenModel:'HP EliteBook X G2i', newGenSku:'WIP', newGenConfigDetails:'UMA i5 + 1 TB SSD + 16 GB RAM + No WWAN', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Laptops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP EliteBook Ultra G1i AI', currentGenSku:'C61MVEC', currentGenType:'Non-Modern', newGenModel:'HP EliteBook X G2i', npiDate:'NPI September 2027', unitCost:1480 }] },
      { id:'CAT-CONV', category:'HW - DaaS Laptop', name:'DaaS Laptop - Convertible, U5, 1 TB SSD, 16 GB RAM, WWAN', screenSize:'14"', touch:true, ramGb:16, storageGb:1000, cpu:'Intel Core Ultra 5 (U5)', clientListPrice:1899, active:true, region:'APAC', country:'India', clientCategory:'Notebooks & Laptops', persona:'Executive', shopDescription:'HP EliteBook X Flip G1i AI — U5, 1TB SSD, 16GB RAM + WWAN', longDescription:'U5 + 1 TB SSD + 16 GB RAM + WWAN', detailedDescription:'Standard delivery time: 10–15 business days from approval.', modelCategory:'"Convertible" Notebook', currentGenModel:'HP EliteBook X Flip G1i AI', currentGenSku:'C2ZK6EC', currentGenConfigDetails:'U5 + 1 TB SSD + 16 GB RAM + WWAN', newGenModel:'HP EliteBook X Flip G2i AI', newGenSku:'WIP', newGenConfigDetails:'U5 + 1 TB SSD + 16 GB RAM + WWAN', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Laptops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP EliteBook X Flip G1i AI', currentGenSku:'C2ZK6EC', currentGenType:'Non-Modern', newGenModel:'HP EliteBook X Flip G2i AI', npiDate:'NPI September 2027', unitCost:1540 }, { vendor:'Dell', currentGenModel:'Dell Latitude 7440 2-in-1', currentGenSku:'LAT7440-U5-14', currentGenType:'Modern', newGenModel:'Dell Latitude 7450 2-in-1', npiDate:'NPI September 2027', unitCost:1510 }, { vendor:'Lenovo', currentGenModel:'Lenovo ThinkPad X13 2-in-1 G5', currentGenSku:'X13G5-U5-14', currentGenType:'Modern', newGenModel:'Lenovo ThinkPad X13 2-in-1 G6', npiDate:'NPI September 2027', unitCost:1495 }] },
      { id:'CAT-MICRODT', category:'HW - DaaS Desktop', name:'DaaS Micro Desktop - Intel Core i5, 16 GB, 1 TB SSD + WLAN', screenSize:'N/A', touch:false, ramGb:16, storageGb:1000, cpu:'Intel Core i5', clientListPrice:1299, active:true, region:'APAC', country:'India', clientCategory:'Desktops', persona:'Standard Office Worker', shopDescription:'HP EliteDesk 8 G1i Mini — Core i5, 16GB, 1TB SSD + WLAN', longDescription:'Intel Core i5 / 16 GB / 1TB SSD + WLAN', detailedDescription:'Standard delivery time: 10–15 business days from approval.', modelCategory:'Micro Desktops', currentGenModel:'HP EliteDesk 8 G1i Mini', currentGenSku:'C41QWEC', currentGenConfigDetails:'Intel Core i5 / 16 GB / 1TB SSD + WLAN', newGenModel:'HP EliteDesk 8 G2i Mini', newGenSku:'WIP', newGenConfigDetails:'Intel Core i5 / 16 GB / 1TB SSD + WLAN', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Desktops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP EliteDesk 8 G1i Mini', currentGenSku:'C41QWEC', currentGenType:'Modern', newGenModel:'HP EliteDesk 8 G2i Mini', npiDate:'NPI September 2027', unitCost:1100 }] },
      { id:'CAT-PERF-I9', category:'HW - DaaS Laptop', name:'DaaS Laptop - Performance i9, 2TB SSD, 64GB RAM, RTX 3000 Blackwell', screenSize:'16"', touch:false, ramGb:64, storageGb:2000, cpu:'Intel Core i9-285HX', clientListPrice:3499, active:true, region:'APAC', country:'India', clientCategory:'Workstation Notebooks', persona:'Power User', shopDescription:'HP ZBook Fury G1i 16 O2O — i9, 64GB, 2TB, RTX 3000 Blackwell', longDescription:'i9-285HX / 2TB SSD / 64GB / RTX 3000 Blackwell / No WWAN / Fingerprint / No NFC / Webcam', detailedDescription:'High-performance mobile workstation. Standard delivery time: 15–20 business days from approval.', modelCategory:'Performance Notebook (i9)', currentGenModel:'HP ZBook Fury G1i 16 O2O', currentGenSku:'C2EL5EC', currentGenConfigDetails:'i9-285HX / 2TB SSD / 64GB / RTX 3000 Blackwell / No WWAN / Fingerprint / No NFC / Webcam', newGenModel:'Unchanged', newGenSku:'Unchanged', newGenConfigDetails:'i9-285HX / 2TB SSD / 64GB / RTX 3000 Blackwell / No WWAN / Fingerprint / No NFC / Webcam', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Premium' as ServiceClass, reportingHierarchy:'HW > Workstations > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP ZBook Fury G1i 16 O2O', currentGenSku:'C2EL5EC', currentGenType:'Modern', newGenModel:'Unchanged', npiDate:'Unchanged', unitCost:3200 }] },
      { id:'CAT-PERF-I7', category:'HW - DaaS Laptop', name:'DaaS Laptop - Performance i7, 2TB SSD, 64GB RAM, RTX 2000 Blackwell', screenSize:'16"', touch:false, ramGb:64, storageGb:2000, cpu:'Intel U7 265HX', clientListPrice:2999, active:true, region:'APAC', country:'India', clientCategory:'Workstation Notebooks', persona:'Power User', shopDescription:'HP ZBook Fury G1i 16, i7 265HX, 2TB, 64 GB, RTX 2000 Blackwell', longDescription:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, be+BT, 8C Batt, FPS, W11 Pro64', detailedDescription:'High-performance mobile workstation. Standard delivery time: 15–20 business days from approval.', modelCategory:'Performance Notebook', currentGenModel:'HP ZBook Fury G1i 16, i7 265HX', currentGenSku:'DA3X7EC', currentGenConfigDetails:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, be+BT, 8C Batt, FPS, W11 Pro64', newGenModel:'HP ZBook Fury G1i 16, i7 265HX', newGenSku:'DA3X7EC', newGenConfigDetails:'Intel U7 265HX, 16 WUXGA BV LED UWVA TS, DSC, Webcam, 64GB DDR5, 2.0TB SSD, be+BT, 8C Batt, FPS, W11 Pro64', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Premium' as ServiceClass, reportingHierarchy:'HW > Workstations > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP ZBook Fury G1i 16, i7 265HX', currentGenSku:'DA3X7EC', currentGenType:'Modern', newGenModel:'HP ZBook Fury G1i 16, i7 265HX', npiDate:'Unchanged', unitCost:2750 }] },
      { id:'CAT-PERFDT', category:'HW - DaaS Desktop', name:'DaaS Desktop - Performance, U7-265K, 2TB SSD, 64GB, RTX A2000', screenSize:'N/A', touch:false, ramGb:64, storageGb:2000, cpu:'Intel U7-265K', clientListPrice:2799, active:true, region:'APAC', country:'India', clientCategory:'Desktops', persona:'Power User', shopDescription:'HP Z2 Tower G1i — U7-265K, 2TB SSD, 64GB, RTX A2000 + Mouse/Keyboard', longDescription:'U7-265K / 2TB SSD / 64GB / RTX A2000 / incl. Mouse / keyboard', detailedDescription:'Standard delivery time: 15–20 business days from approval.', modelCategory:'Performance Desktops', currentGenModel:'HP Z2 Tower G1i', currentGenSku:'C2LW9EC', currentGenConfigDetails:'U7-265K / 2TB SSD / 64GB / RTX A2000 / incl. Mouse / keyboard', newGenModel:'HP Z2 Tower G1i', newGenSku:'C2LW9EC', newGenConfigDetails:'U7-265K / 2TB SSD / 64GB / RTX A2000 / incl. Mouse / keyboard', eolTimeline:'EOL view July 2027 - H2 FY2026', serviceClass:'DaaS Standard' as ServiceClass, reportingHierarchy:'HW > Desktops > DaaS' as ReportingHierarchy, keywords:'', vendorMappings:[{ vendor:'HP', currentGenModel:'HP Z2 Tower G1i', currentGenSku:'C2LW9EC', currentGenType:'Modern', newGenModel:'HP Z2 Tower G1i', npiDate:'Unchanged', unitCost:2500 }] },
    ];
    catalogRef.current = catalog; setCatalog(catalog);

    // Warehouse stock
    const stock: AssetRecord[] = [
      ...Array.from({ length: 20 }).map((_, i) => ({ assetId:'AST-' + pad(counters.current.ast++,6), serialNumber:'SN-HP-CONV-' + pad(i+1,4), deviceType:'Laptop' as const, vendor:'HP' as VendorName, model:'HP EliteBook X Flip G1i AI', catalogItemId:'CAT-CONV', cost:1540, location:'Cognizant Warehouse', shipmentStatus:'DELIVERED' as const, lifecycleStatus:'IN_STOCK' as const, poId:'PO-2026-00099', vendorOrderId:'VO-2026-00050', grnId:'GRN-2026-00050' })),
      ...Array.from({ length: 10 }).map((_, i) => ({ assetId:'AST-' + pad(counters.current.ast++,6), serialNumber:'SN-HP-14STD-' + pad(i+1,4), deviceType:'Laptop' as const, vendor:'HP' as VendorName, model:'HP EliteBook 8 G1i 14 AI', catalogItemId:'CAT-14STD', cost:1420, location:'Cognizant Warehouse', shipmentStatus:'DELIVERED' as const, lifecycleStatus:'IN_STOCK' as const, poId:'PO-2026-00098', vendorOrderId:'VO-2026-00049', grnId:'GRN-2026-00049' })),
    ];
    assetsRef.current = stock; setAssets(stock);

    // Scenario 1
    const po1 = intakePOSeed({ clientName:'Meridian Financial Group', poNumber:'MFG-PO-88213', source:'API', catalogItemId:'CAT-CONV', quantity:100, unitCost:1540, notes:'Refresh cycle FY26 - branch staff laptops.' });
    approvePOSeed(po1.id, 'A. Subramanian (Cognizant)');
    const vo1 = createVOSeed({ poId:po1.id, requestId:po1.requestId!, vendor:'HP', vendorSku:'C2ZK6EC', channel:'Webshop Portal', quantity:100, unitCost:1540, destination:'Cognizant Warehouse', catalogItemId:po1.catalogItemId });
    vosRef.current = vosRef.current.map(v => v.id === vo1.id ? { ...v, status:'SUBMITTED', submittedAt:new Date().toISOString() } : v); setVOs([...vosRef.current]);
    vosRef.current = vosRef.current.map(v => v.id === vo1.id ? { ...v, status:'CONFIRMED', confirmedAt:new Date().toISOString(), eta:'2026-08-20' } : v); setVOs([...vosRef.current]);
    addEventSeed(vo1.id, 'LABEL_CREATED', 'HP Fulfillment Center, TX');
    addEventSeed(vo1.id, 'IN_TRANSIT', 'Memphis, TN');
    addEventSeed(vo1.id, 'OUT_FOR_DELIVERY', 'Chennai Regional Hub');
    addEventSeed(vo1.id, 'DELIVERED', 'Cognizant Warehouse - Chennai');
    const grn1 = createGRNSeed({ vendorOrderId:vo1.id, poId:po1.id, quantityReceived:100, quantityExpected:100, receivedBy:'Warehouse Ops - S. Iyer', podFileName:'POD_HP_VO2026-00118.pdf', condition:'Good' });
    const inv1: VendorInvoice = { id:'INV-HP-08821', vendor:'HP', vendorOrderId:vo1.id, grnId:grn1.id, poId:po1.id, amount:154000, currency:'USD', invoiceDate:'2026-08-05', dueDate:'2026-09-04', status:'APPROVED_FOR_PAYMENT', matchResult:{ poMatch:true, podMatch:true, grnMatch:true } };
    invoicesRef.current = [inv1, ...invoicesRef.current]; setInvoices([...invoicesRef.current]);
    const ls1: LeaseSchedule = { id:'LS-HP-2026-041', vendor:'HP', invoiceId:inv1.id, termMonths:36, monthlyPayment:4278, startDate:'2026-08-10', endDate:'2029-08-10', status:'PENDING' };
    setLeases([ls1]);
    assetsRef.current = assetsRef.current.map((a, i) => i < 3 ? { ...a, assignedUser:`Employee-${1000+i}`, location:'Chennai Branch Office', lifecycleStatus:'DEPLOYED' } : a);
    setAssets([...assetsRef.current]);

    // Scenario 2
    intakePOSeed({ clientName:'Meridian Financial Group', poNumber:'MFG-PO-88250', source:'PDF_IMPORT', fileName:'MFG_PO_88250.pdf', catalogItemId:'CAT-14STD', quantity:40, unitCost:1585, notes:'New hire cohort - Q4.' });

    // Scenario 3
    const po3 = intakePOSeed({ clientName:'Meridian Financial Group', poNumber:'MFG-PO-88199', source:'API', catalogItemId:'CAT-14STD', quantity:15, unitCost:1585, notes:'Early pilot batch.' });
    approvePOSeed(po3.id, 'A. Subramanian (Cognizant)');
    const vo3 = createVOSeed({ poId:po3.id, requestId:po3.requestId!, vendor:'HP', vendorSku:'C2ZK6EC', channel:'Webshop Portal', quantity:15, unitCost:1585, destination:'Cognizant Warehouse', catalogItemId:po3.catalogItemId });
    vosRef.current = vosRef.current.map(v => v.id === vo3.id ? { ...v, status:'SUBMITTED', submittedAt:new Date().toISOString() } : v); setVOs([...vosRef.current]);
    vosRef.current = vosRef.current.map(v => v.id === vo3.id ? { ...v, status:'CONFIRMED', confirmedAt:new Date().toISOString(), eta:'2026-08-25' } : v); setVOs([...vosRef.current]);

    // Scenario 4
    const po4 = intakePOSeed({ clientName:'Meridian Financial Group', poNumber:'MFG-PO-88301', source:'API', catalogItemId:'CAT-CONV', quantity:50, unitCost:1540, notes:'Q3 expansion.' });
    approvePOSeed(po4.id, 'A. Subramanian (Cognizant)');
    const inStockQty4 = assetsRef.current.filter(a => a.catalogItemId === 'CAT-CONV' && a.lifecycleStatus === 'IN_STOCK' && a.location === 'Cognizant Warehouse').length;
    const pr4: PurchaseRequisition = { id:'PR-2026-' + pad(counters.current.pr++), poId:po4.id, requestId:po4.requestId!, catalogItemId:'CAT-CONV', requestedQty:50, inStockQty:inStockQty4, onOrderQty:0, balanceQty:Math.max(50-inStockQty4,0), preferredVendor:'HP', estimatedUnitCost:1540, estimatedTotalCost:Math.max(50-inStockQty4,0)*1540, costCenter:'CC-APAC-IT-01', justification:'Q3 laptop refresh for Chennai branch expansion.', requestedBy:'S. Krishnamurthy', requestedAt:new Date().toISOString(), status:'APPROVED', approvedBy:'A. Subramanian (Cognizant)', approvedAt:new Date().toISOString(), emailedTo:'a.subramanian@cognizant.com', emailedAt:new Date().toISOString(), approvalNotificationSentTo:PROCUREMENT_MAILBOX, approvalNotificationSentAt:new Date().toISOString(), procurementNotificationSentTo:PROCUREMENT_MAILBOX, procurementNotificationSentAt:new Date().toISOString() };
    prsRef.current = [pr4, ...prsRef.current]; setPRs([...prsRef.current]);

    // Scenario 5
    const po5 = intakePOSeed({ clientName:'Meridian Financial Group', poNumber:'MFG-PO-88310', source:'API', catalogItemId:'CAT-14STD', quantity:25, unitCost:1585, notes:'Finance team laptop upgrade.' });
    approvePOSeed(po5.id, 'A. Subramanian (Cognizant)');
    const inStockQty5 = assetsRef.current.filter(a => a.catalogItemId === 'CAT-14STD' && a.lifecycleStatus === 'IN_STOCK' && a.location === 'Cognizant Warehouse').length;
    const pr5: PurchaseRequisition = { id:'PR-2026-' + pad(counters.current.pr++), poId:po5.id, requestId:po5.requestId!, catalogItemId:'CAT-14STD', requestedQty:25, inStockQty:inStockQty5, onOrderQty:0, balanceQty:Math.max(25-inStockQty5,0), preferredVendor:'Dell', estimatedUnitCost:1585, estimatedTotalCost:Math.max(25-inStockQty5,0)*1585, costCenter:'CC-FIN-02', justification:'Finance team annual device refresh.', requestedBy:'R. Nair', requestedAt:new Date().toISOString(), status:'PENDING_APPROVAL', emailedTo:'a.subramanian@cognizant.com', emailedAt:new Date().toISOString(), approvalNotificationSentTo:PROCUREMENT_MAILBOX, approvalNotificationSentAt:new Date().toISOString() };
    prsRef.current = [pr5, ...prsRef.current]; setPRs([...prsRef.current]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashboardStats = useMemo(() => ({
    totalPOs: purchaseOrders.length,
    pendingApproval: purchaseOrders.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'ACKNOWLEDGED').length,
    approved: purchaseOrders.filter(p => p.status === 'APPROVED').length,
    inProcurement: vendorOrders.filter(v => v.status === 'SUBMITTED' || v.status === 'CONFIRMED' || v.status === 'IN_PRODUCTION').length,
    inTransit: vendorOrders.filter(v => v.status === 'SHIPPED').length,
    delivered: vendorOrders.filter(v => v.status === 'DELIVERED').length,
    invoiceExceptions: invoices.filter(i => i.status === 'EXCEPTION').length,
    totalAssets: assets.length,
    deployedAssets: assets.filter(a => a.lifecycleStatus === 'DEPLOYED').length,
    totalDevicesRequested: purchaseOrders.reduce((s, p) => s + p.quantity, 0),
    pendingPrApprovals: purchaseRequisitions.filter(pr => pr.status === 'PENDING_APPROVAL').length,
    unreadNotifications: notifications.filter(n => !n.read).length,
  }), [purchaseOrders, purchaseRequisitions, vendorOrders, invoices, assets, notifications]);

  const value: DataContextValue = {
    purchaseOrders, purchaseRequisitions, vendorOrders, goodsReceipts,
    invoices, leaseSchedules, assets, auditLog, catalog, notifications, dashboardStats,
    auditFor, markNotificationRead, markAllNotificationsRead,
    intakePO, approvePO, rejectPO, logAudit,
    availableWarehouseStock, onOrderQuantity, fulfillFromWarehouse,
    createPurchaseRequisition, submitPrForApproval, emailPrForApproval, approvePr, rejectPr, markPrConverted,
    createVendorOrder, submitVendorOrder, advanceVendorOrderStatus, addShipmentEvent,
    createGoodsReceipt, submitInvoice, approveInvoicePayment, markInvoicePaid, createLeaseSchedule,
    assignAsset, retireAsset, upsertCatalogItem,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
