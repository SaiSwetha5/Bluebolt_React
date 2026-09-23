export type PoSource = 'API' | 'PDF_IMPORT' | 'MANUAL';
export type PoStatus = 'RECEIVED' | 'ACKNOWLEDGED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export interface PurchaseOrder {
  id: string; requestId?: string; clientName: string; poNumber: string; source: PoSource;
  fileName?: string; fileDataUrl?: string; catalogItemId: string; partNumber?: string;
  quantity: number; unitCost: number; status: PoStatus; submittedAt: string;
  acknowledgedAt?: string; approvedAt?: string; approvedBy?: string;
  rejectedReason?: string; notes?: string;
  supplier?: string; shipment?: string; country?: string; state?: string; city?: string;
}
export type PrStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
export interface PurchaseRequisition {
  id: string; poId: string; requestId: string; catalogItemId: string;
  requestedQty: number; inStockQty: number; onOrderQty: number; balanceQty: number;
  preferredVendor?: VendorName; estimatedUnitCost: number; estimatedTotalCost: number;
  costCenter: string; justification: string; requestedBy: string; requestedAt: string;
  status: PrStatus; approvedBy?: string; approvedAt?: string; rejectedReason?: string;
  emailedTo?: string; emailedAt?: string;
  approvalNotificationSentTo?: string; approvalNotificationSentAt?: string;
  procurementNotificationSentTo?: string; procurementNotificationSentAt?: string;
}
export type VendorName = 'Dell' | 'Lenovo' | 'HP';
export type VendorOrderStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ModelCategory =
  | '14" Standard Notebook' | '16" Standard Notebook'
  | '"Ultralight" Notebook' | '"Convertible" Notebook' | 'Micro Desktops'
  | 'Performance Notebook (i9)' | 'Performance Notebook' | 'Performance Desktops'
  | 'Ubuntu High-end' | 'Rackmount Workstation';
export type ServiceClass = 'DaaS Standard' | 'DaaS Premium' | 'DaaS Executive';
export type ReportingHierarchy = 'HW > Laptops > DaaS' | 'HW > Desktops > DaaS' | 'HW > Workstations > DaaS';
export interface VendorOrder {
  id: string; cognizantPoNumber: string; poId: string; requestId: string; prId?: string;
  vendor: VendorName; vendorSku: string;
  channel: 'Webshop Portal' | 'Integrated Procurement API' | 'EDI';
  quantity: number; unitCost: number; status: VendorOrderStatus;
  createdAt: string; submittedAt?: string; confirmedAt?: string; eta?: string;
  destination: 'Cognizant Warehouse' | 'Client Office'; warehouseAddress?: string;
  trackingNumber?: string; shipmentStatus?: ShipmentStatus; shipmentHistory: ShipmentEvent[];
  catalogItemId: string; modelCategory?: ModelCategory;
  currentGeneration?: string; sku1NonModern?: string; newGeneration?: string;
}
export type ShipmentStatus = 'PENDING' | 'LABEL_CREATED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';
export interface ShipmentEvent { status: ShipmentStatus; timestamp: string; location?: string; note?: string; }
export interface GoodsReceipt {
  id: string; vendorOrderId: string; poId: string; quantityReceived: number; quantityExpected: number;
  receivedAt: string; receivedBy: string; podFileName?: string; podDataUrl?: string;
  condition: 'Good' | 'Damaged' | 'Partial'; notes?: string;
}
export type InvoiceStatus = 'SUBMITTED' | 'MATCHED' | 'EXCEPTION' | 'APPROVED_FOR_PAYMENT' | 'PAID';
export type PaymentMethod = 'ACH' | 'WIRE' | 'CARD' | 'CHECK';
export interface VendorInvoice {
  id: string; vendor: VendorName; vendorOrderId: string; grnId?: string; poId: string;
  amount: number; currency: 'USD'; invoiceDate: string; dueDate: string; status: InvoiceStatus;
  leaseScheduleId?: string;
  matchResult?: { poMatch: boolean; podMatch: boolean; grnMatch: boolean; variance?: string; };
  // Populated once the invoice is actually paid, mirroring how Accounts
  // Receivable records a Receipt against a customer invoice.
  paymentId?: string; paymentMethod?: PaymentMethod; paymentReference?: string; paidAt?: string;
  // Dunning: how many payment reminders have gone out on this payable and when
  // the last one was sent (mirrors ReceivableInvoice's dunning fields).
  reminderCount?: number; lastReminderAt?: string;
  // Recurring billing: set when this invoice was auto-generated (or is the
  // seed of) a recurring lease billing cycle. period/totalPeriods let the UI
  // show "Period 3 of 24" etc.
  recurring?: boolean; period?: number; totalPeriods?: number;
}
// A single payment run against one or more vendor invoices — supports paying
// several APPROVED_FOR_PAYMENT invoices together in one batch/reference.

export interface VendorPayment {
  id: string; invoiceIds: string[]; vendor: VendorName | 'MULTIPLE'; totalAmount: number;
  method: PaymentMethod; reference: string; paidAt: string;
}
export interface LeaseSchedule {
  id: string; vendor: VendorName; invoiceId: string; termMonths: number; monthlyPayment: number;
  startDate: string; endDate: string; status: 'ACTIVE' | 'PENDING' | 'CLOSED';
  // Automated recurring AP billing: the next period to invoice for this
  // lease. The seed invoice (invoiceId above) counts as period 1, so this
  // starts at 2. Once an invoice against a period is paid, the next one is
  // generated automatically. Stays undefined/absent for leases created
  // before this feature existed (recurring generation simply won't fire).
  nextInvoicePeriod?: number;
}
export type LifecycleStatus = 'IN_PROCUREMENT' | 'IN_TRANSIT' | 'IN_STOCK' | 'DEPLOYED' | 'IN_REPAIR' | 'RETIRED';
export interface AssetRecord {
  assetId: string; serialNumber: string; deviceType: 'Laptop' | 'Desktop' | 'Tablet' | 'Monitor';
  vendor: VendorName; model: string; catalogItemId: string;
  leaseStartDate?: string; leaseEndDate?: string; cost: number; assignedUser?: string;
  location: string; shipmentStatus: ShipmentStatus | 'N/A'; contract?: string;
  lifecycleStatus: LifecycleStatus; poId: string; vendorOrderId?: string; grnId?: string;
}
export type AuditAction =
  | 'PO_RECEIVED' | 'PO_ACKNOWLEDGED' | 'PO_APPROVED' | 'PO_REJECTED'
  | 'PR_CREATED' | 'PR_SUBMITTED_FOR_APPROVAL' | 'PR_APPROVED' | 'PR_REJECTED' | 'PR_EMAILED' | 'PR_CONVERTED'
  | 'PR_APPROVAL_NOTIFICATION_SENT' | 'PR_PROCUREMENT_NOTIFICATION_SENT'
  | 'VENDOR_ORDER_CREATED' | 'VENDOR_ORDER_SUBMITTED' | 'VENDOR_ORDER_STATUS_CHANGED'
  | 'SHIPMENT_UPDATE' | 'GRN_GENERATED' | 'POD_CAPTURED'
  | 'INVOICE_SUBMITTED' | 'INVOICE_MATCHED' | 'INVOICE_EXCEPTION' | 'PAYMENT_APPROVED'
  | 'LEASE_SCHEDULE_CREATED' | 'ASSET_CREATED' | 'ASSET_UPDATED' | 'ASSET_ASSIGNED' | 'ASSET_RETIRED'
  | 'CATALOG_ITEM_CREATED' | 'CATALOG_ITEM_UPDATED';
export interface AuditLogEntry {
  id: string; timestamp: string; action: AuditAction;
  entityType: 'PO' | 'PR' | 'VendorOrder' | 'GRN' | 'Invoice' | 'Lease' | 'Asset' | 'Catalog';
  entityId: string; actor: string; details: string;
}
export type CatalogCategory = 'HW - DaaS Laptop' | 'HW - DaaS Desktop' | 'HW - Monitor';
export interface CustomerCatalogFields {
  country: string; region: string; clientCategory: string; persona: string;
  shopDescription: string; longDescription: string; detailedDescription: string;
  keywords: string; active: boolean; serviceClass: ServiceClass;
  reportingHierarchy: ReportingHierarchy; clientListPrice: number; touch: boolean;
}
export interface VendorCatalogFields {
  modelCategory: ModelCategory; eolTimeline: string;
  currentGenModel: string; currentGenSku: string; currentGenConfigDetails: string;
  newGenModel: string; newGenSku: string; newGenConfigDetails: string;
  vendorMappings: VendorSkuMapping[];
}
export interface CatalogItem extends CustomerCatalogFields, VendorCatalogFields {
  id: string; category: CatalogCategory; name: string;
  screenSize: string; ramGb: number; storageGb: number; cpu: string;
}
export interface VendorSkuMapping {
  vendor: VendorName; currentGenModel: string; currentGenSku: string;
  currentGenType: 'Modern' | 'Non-Modern'; newGenModel: string; npiDate: string; unitCost: number;
}
export interface PrNotification {
  id: string; timestamp: string; read: boolean;
  type: 'APPROVAL_REQUESTED' | 'PR_APPROVED' | 'PR_REJECTED';
  prId: string; subject: string; body: string; to: string;
}
export const MODEL_CATEGORIES: ModelCategory[] = [
  '14" Standard Notebook', '16" Standard Notebook',
  '"Ultralight" Notebook', '"Convertible" Notebook', 'Micro Desktops',
  'Performance Notebook (i9)', 'Performance Notebook', 'Performance Desktops',
  'Ubuntu High-end', 'Rackmount Workstation',
];
export const SERVICE_CLASSES: ServiceClass[] = ['DaaS Standard', 'DaaS Premium', 'DaaS Executive'];
export const REPORTING_HIERARCHIES: ReportingHierarchy[] = [
  'HW > Laptops > DaaS', 'HW > Desktops > DaaS', 'HW > Workstations > DaaS',
];
export const PROCUREMENT_MAILBOX = 'procurement.mailbox@cognizant.com';

// ============================================================================
// Continuation modules — DaaS Receivables & Account Management
// (appended; nothing above this line was modified)
// ============================================================================

// ---- DaaS Receivables (customer subscriptions / device rentals / receipts) ----
export type SubscriptionStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED';
export interface CustomerSubscription {
  id: string; customerAccountId: string; customerName: string;
  assetId: string; catalogItemId: string; serviceClass: ServiceClass;
  assetCost: number; annualInterestRatePct: number; termMonths: number;
  residualValue: number; monthlyPayment: number;
  startDate: string; endDate: string; billingDay: number;
  status: SubscriptionStatus; nextInvoicePeriod: number; createdAt: string;
}
export type ReceivableInvoiceStatus = 'DUE' | 'SENT' | 'PAID' | 'OVERDUE';
export interface ReceivableInvoice {
  id: string; subscriptionId: string; customerName: string; period: number;
  amount: number; issueDate: string; dueDate: string; status: ReceivableInvoiceStatus;
  receiptId?: string;
  // Dunning: how many reminders have gone out and when the last one was sent.
  reminderCount?: number; lastReminderAt?: string;
  // Explicit traceability back to the vendor (AP) invoice that funded the
  // asset being billed here — set whenever this receivable is generated
  // (manually or automatically) for a subscription whose asset has a known
  // vendor invoice on file. Lets the UI show "this customer invoice maps to
  // that vendor invoice" instead of the two just happening to share a
  // subscription id under the hood.
  vendorInvoiceId?: string;
}
export interface Receipt {
  id: string; invoiceId: string; subscriptionId: string; amount: number;
  receivedAt: string; method: 'ACH' | 'WIRE' | 'CARD' | 'CHECK'; reference: string;
}

// A manually-recorded payment received from a customer, tied directly to a
// vendor (AP) invoice rather than to a subscription/lease deal. This is what
// powers the standalone Invoice Cash Ledger P&L screen: any vendor invoice —
// whether or not it's part of a DaaS subscription — can have customer cash
// collected against it and tracked to a balance.
export interface CustomerCollection {
  id: string; vendorInvoiceId: string; amount: number; receivedAt: string;
  method: 'ACH' | 'WIRE' | 'CARD' | 'CHECK'; reference: string; payerName?: string; notes?: string;
}

// ---- Account Management (users, roles/RBAC, vendor & customer accounts) ----
export type SystemRole = 'Admin' | 'Procurement Manager' | 'Finance Approver' | 'Warehouse Ops' | 'Customer Success' | 'Viewer';
export const SYSTEM_ROLES: SystemRole[] = ['Admin', 'Procurement Manager', 'Finance Approver', 'Warehouse Ops', 'Customer Success', 'Viewer'];
export interface Permission { module: string; view: boolean; edit: boolean; approve: boolean; }
export interface RoleDefinition { role: SystemRole; description: string; permissions: Permission[]; }
export type SsoProvider = 'Okta' | 'Azure AD' | 'Google Workspace' | 'None';
export interface AppUser {
  id: string; name: string; email: string; role: SystemRole;
  status: 'ACTIVE' | 'DISABLED'; ssoProvider: SsoProvider;
  lastLogin?: string; createdAt: string;
}
export interface VendorAccount {
  id: string; name: VendorName; contactName: string; contactEmail: string;
  contractRef: string; paymentTerms: string; status: 'ACTIVE' | 'INACTIVE';
}
export interface CustomerAccount {
  id: string; name: string; region: string; billingContact: string; billingEmail: string;
  status: 'ACTIVE' | 'INACTIVE'; creditTermDays: number;
}
