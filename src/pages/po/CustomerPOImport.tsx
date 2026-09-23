import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import { CUSTOMER_PO_MOCK } from '../../mocks/Customer_PO_MOCK';
import { getPOExtractUrl } from '../../config/api.config';

interface FormFieldProps {
  label: string;
  value?: string | number | null;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  isMono?: boolean;
  onChange?: (val: string) => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  placeholder = '—',
  readOnly = false,
  className = '',
  isMono = false,
  onChange,
}) => (
  <div className={`space-y-1 ${className}`}>
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
      {label}
    </label>
    <input
      type="text"
      readOnly={readOnly}
      value={value !== undefined && value !== null && value !== '' ? String(value) : ''}
      placeholder={placeholder}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`w-full px-3 py-1.5 text-xs border rounded-md transition-colors ${
        readOnly
          ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed'
          : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500'
      } ${isMono ? 'font-mono' : ''}`}
    />
  </div>
);

interface AccordionSectionProps {
  title: string;
  countBadge?: string | number;
  isOpenDefault?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  countBadge,
  isOpenDefault = false,
  accentColor = 'bg-blue-600',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  return (
    <div className="overflow-hidden transition-all bg-white border shadow-sm border-slate-200 rounded-xl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-white hover:bg-slate-50/75 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${accentColor}`}></span>
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700">{title}</h3>
          {countBadge !== undefined && (
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {countBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">
            {isOpen ? 'Hide Details' : 'View Details'}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && <div className="p-5 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
};

export interface LineItem {
  lineNo: number;
  description: string;
  fullDescription?: string;
  partNumber: string;
  catalogMatch?: string;
  entityName?: string;
  entityCode?: string;
  quantity: number;
  uom?: string;
  unitPrice: number;
  netAmount: number;
  amount: number;
  billingMethod?: string;
}

interface UploadDebugState {
  phase: 'idle' | 'starting' | 'requesting' | 'success' | 'error' | 'mock-loaded' | 'cancelled';
  requestUrl: string;
  fileName: string;
  startedAt: string;
  responseStatus?: number;
  responseStatusText?: string;
  errorMessage?: string;
}

const emptyFormState: Partial<LineItem> = {
  partNumber: '',
  catalogMatch: '',
  entityName: '',
  entityCode: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  billingMethod: 'Monthly',
};

export default function CustomerPOImport() {
  const navigate = useNavigate();
  const location = useLocation();
  const dataContext = useData();

  const { intakePO, updatePO, catalog = [] } = dataContext || {};

  const passedRecord = (location.state as any)?.poRecord;
  const isExistingPO = Boolean(passedRecord);

  const [poStatus, setPoStatus] = useState<string>('RECEIVED');
  const isApproved = poStatus === 'APPROVED';
  const isRejected = poStatus === 'REJECTED';
  const isReadOnly = false;

  const [poFile, setPoFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showParseSuccess, setShowParseSuccess] = useState(false);

  const toastTimerRef = useRef<number | null>(null);

  const [uploadDebug, setUploadDebug] = useState<UploadDebugState>({
    phase: 'idle',
    requestUrl: '',
    fileName: '',
    startedAt: '',
  });

  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    action: 'APPROVED' | 'REJECTED';
    remarks: string;
    justification: string;
    error?: string;
  }>({
    isOpen: false,
    action: 'APPROVED',
    remarks: '',
    justification: '',
    error: '',
  });

  const [poData, setPoData] = useState<any>({
    orderNo: '',
    customerName: '',
    contractId: '',
    revision: '',
    issuedOn: '',
    createdOn: '',
    createdBy: '',
    requester: '',
    poEndDate: '',
    totalAmount: 0,
    currency: 'USD',
    intakeStatus: 'AWAITING_UPLOAD',
    shipment: 'Air Freight',
    supplier: null,
    shipTo: null,
    billTo: null,
    deliverTo: null,
    approvalHistory: [],
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [editForm, setEditForm] = useState<Partial<LineItem>>(emptyFormState);

  // Clear toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Prefill the form whenever a row is passed via state
  useEffect(() => {
    if (passedRecord) {
      setPoStatus(passedRecord.status || 'RECEIVED');
      setPoData({
        orderNo: passedRecord.poNumber || passedRecord.orderNo || '',
        customerName: passedRecord.clientName || passedRecord.customerName || passedRecord.supplier?.name || '',
        contractId: passedRecord.contractId || '',
        revision: passedRecord.revision || '',
        issuedOn: passedRecord.issuedOn || passedRecord.submittedAt || '',
        createdOn: passedRecord.createdOn || passedRecord.submittedAt || '',
        createdBy: passedRecord.createdBy || '',
        requester: passedRecord.requester || '',
        poEndDate: passedRecord.poEndDate || passedRecord.endDate || '',
        totalAmount: passedRecord.totalAmount || 0,
        currency: passedRecord.currency || 'USD',
        intakeStatus: passedRecord.status || 'RECEIVED',
        shipment: passedRecord.shipment || 'Air Freight',
        supplier: passedRecord.supplier || null,
        shipTo: passedRecord.shipTo || null,
        billTo: passedRecord.billTo || null,
        deliverTo: passedRecord.deliverTo || null,
        approvalHistory: passedRecord.approvalHistory || [],
      });

      if (passedRecord.lineItems && passedRecord.lineItems.length > 0) {
        const mappedItems: LineItem[] = passedRecord.lineItems.map((li: any, idx: number) => ({
          lineNo: li.lineNo || idx + 1,
          description: li.description || 'Equipment / Line Item',
          fullDescription: li.fullDescription || li.description,
          partNumber: li.partNumber || 'FN4FC',
          catalogMatch: li.catalogMatch || li.partNumber || 'FN4FC',
          entityName: li.entityName || passedRecord.clientName || '',
          entityCode: li.entityCode || '',
          quantity: Number(li.quantity) || 1,
          uom: li.uom || 'each',
          unitPrice: Number(li.unitPrice) || 0,
          netAmount: (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
          amount: Number(li.amount) || (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
          billingMethod: li.billingMethod || 'Monthly',
        }));
        setLineItems(mappedItems);
        setSelectedIdx(0);
      } else {
        const defaultItem: LineItem = {
          lineNo: 1,
          description: 'Item Details',
          partNumber: passedRecord.partNumber || 'SP-DIPC CS',
          catalogMatch: passedRecord.catalogItemId || passedRecord.partNumber || 'SP-DIPC CS',
          entityName: passedRecord.clientName || '',
          entityCode: '',
          quantity: Number(passedRecord.quantity) || 1,
          unitPrice: Number(passedRecord.unitCost) || 0,
          netAmount: (Number(passedRecord.quantity) || 1) * (Number(passedRecord.unitCost) || 0),
          amount:
            Number(passedRecord.totalAmount) ||
            (Number(passedRecord.quantity) || 1) * (Number(passedRecord.unitCost) || 0),
          billingMethod: 'Monthly',
        };
        setLineItems([defaultItem]);
        setSelectedIdx(0);
      }
      setIsParsed(true);
    }
  }, [passedRecord]);

  const handlePdfUpload = async (file: File) => {
    const requestUrl = getPOExtractUrl();
    const startedAt = new Date().toLocaleTimeString();

    setPoFile(file);
    setIsParsed(false);
    setIsParsing(true);
    setShowParseSuccess(false);
    setUploadProgress(10);

    setUploadDebug({
      phase: 'starting',
      requestUrl,
      fileName: file.name,
      startedAt,
    });

    // Reset previous PO
    setPoData({
      orderNo: '',
      customerName: '',
      contractId: '',
      revision: '',
      issuedOn: '',
      createdOn: '',
      createdBy: '',
      requester: '',
      poEndDate: '',
      totalAmount: 0,
      currency: 'USD',
      intakeStatus: 'PARSING',
      shipment: '',
      supplier: null,
      shipTo: null,
      billTo: null,
      deliverTo: null,
      approvalHistory: [],
    });
    setLineItems([]);
    setSelectedIdx(-1);

    // Simulate steady progress while parsing
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 250);

    try {
      let extractedData: any = CUSTOMER_PO_MOCK?.data;

      if (!extractedData) {
        const formData = new FormData();
        formData.append('file', file);

        setUploadDebug((prev) => ({ ...prev, phase: 'requesting' }));

        const response = await fetch(requestUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        extractedData = json.data ?? json;
      } else {
        // Mock delay simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadDebug((prev) => ({
        ...prev,
        phase: 'success',
        errorMessage: undefined,
      }));

      setPoData({
        orderNo: extractedData.orderNo || '',
        contractId: extractedData.contractId || '',
        revision: extractedData.revision || '',
        issuedOn: extractedData.issuedOn || '',
        createdOn: extractedData.createdOn || '',
        createdBy: extractedData.createdBy || '',
        requester: extractedData.requester || '',
        poEndDate: extractedData.poEndDate || '',
        totalAmount: extractedData.totalAmount || 0,
        currency: extractedData.currency || 'USD',
        intakeStatus: extractedData.intakeStatus || 'RECEIVED',
        customerName: extractedData.customerName || extractedData.billTo?.company || 'Customer',
        shipment: extractedData.shipment || 'Air Freight',
        supplier: extractedData.supplier || null,
        shipTo: extractedData.shipTo || null,
        billTo: extractedData.billTo || null,
        deliverTo: extractedData.deliverTo || null,
        approvalHistory: [],
      });

      const parsedItems: LineItem[] = (extractedData.lineItems || []).map((item: any, idx: number) => ({
        lineNo: item.lineNo || idx + 1,
        description: item.description || '',
        fullDescription: item.fullDescription,
        partNumber: item.partNumber || '',
        catalogMatch: item.catalogMatch || item.partNumber || '',
        entityName: extractedData.billTo?.name || item.entityName || '',
        entityCode: extractedData.deliverTo?.locationCode?.id || item.entityCode || '',
        quantity: item.quantity || 1,
        uom: item.uom || 'each',
        unitPrice: item.unitPrice || 0,
        netAmount: item.netAmount || 0,
        amount: item.amount || 0,
        billingMethod: item.billingMethod || 'Monthly',
      }));

      setLineItems(parsedItems);
      if (parsedItems.length > 0) {
        setSelectedIdx(0);
      }
      setIsParsed(true);

      // Trigger success notification toast
      setShowParseSuccess(true);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setShowParseSuccess(false);
      }, 3500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadDebug((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }));
      setIsParsed(false);
      alert('Unable to parse the purchase order.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsParsing(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  useEffect(() => {
    if (selectedIdx >= 0 && selectedIdx < lineItems.length) {
      const active = lineItems[selectedIdx];
      setEditForm({
        partNumber: active.partNumber,
        catalogMatch: active.catalogMatch || active.partNumber,
        entityName: active.entityName || '',
        entityCode: active.entityCode || '',
        quantity: active.quantity,
        unitPrice: active.unitPrice,
        amount: active.amount,
        billingMethod: active.billingMethod || 'Monthly',
      });
    }
  }, [selectedIdx, lineItems]);

  const { totalUnits, grandTotal } = useMemo(() => {
    const units = lineItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const sum = lineItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    return { totalUnits: units, grandTotal: sum };
  }, [lineItems]);

  const handleEditChange = (field: keyof LineItem, val: any) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(val) || 0 : Number(next.quantity) || 0;
        const price = field === 'unitPrice' ? Number(val) || 0 : Number(next.unitPrice) || 0;
        next.amount = qty * price;
      }
      return next;
    });
  };

  const handleStartAddNewItem = () => {
    setSelectedIdx(-1);
    setEditForm({
      ...emptyFormState,
      entityName: poData.billTo?.name || '',
      entityCode: poData.deliverTo?.locationCode?.id || '',
    });
  };

  const handleConfirmAddItem = () => {
    if (!editForm.partNumber?.trim()) {
      alert('Please provide a Part Number before adding a line item.');
      return;
    }

    const qty = Number(editForm.quantity) || 1;
    const price = Number(editForm.unitPrice) || 0;

    const newItem: LineItem = {
      lineNo: lineItems.length + 1,
      description: editForm.description || 'Equipment / Peripheral',
      partNumber: editForm.partNumber.trim(),
      catalogMatch: editForm.catalogMatch || editForm.partNumber.trim(),
      entityName: editForm.entityName || poData.billTo?.name || '',
      entityCode: editForm.entityCode || poData.deliverTo?.locationCode?.id || '',
      quantity: qty,
      unitPrice: price,
      netAmount: qty * price,
      amount: qty * price,
      billingMethod: editForm.billingMethod || 'Monthly',
    };

    const updated = [...lineItems, newItem];
    setLineItems(updated);
    setSelectedIdx(updated.length - 1);
  };

  const handleUpdateLineItem = () => {
    if (selectedIdx < 0 || selectedIdx >= lineItems.length) {
      alert('Please select a line item from the table first to update it.');
      return;
    }
    if (!editForm.partNumber?.trim()) {
      alert('Part Number cannot be empty.');
      return;
    }

    const qty = Number(editForm.quantity) || 0;
    const price = Number(editForm.unitPrice) || 0;

    setLineItems((prev) => {
      const updated = [...prev];
      updated[selectedIdx] = {
        ...updated[selectedIdx],
        ...editForm,
        partNumber: editForm.partNumber!.trim(),
        quantity: qty,
        unitPrice: price,
        amount: qty * price,
        netAmount: qty * price,
      };
      return updated;
    });
  };

  const handleDeleteRow = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    if (lineItems.length === 1) {
      alert('A purchase order requires at least one line item.');
      return;
    }
    const updated = lineItems.filter((_, idx) => idx !== indexToDelete);
    setLineItems(updated);
    if (selectedIdx === indexToDelete) {
      handleStartAddNewItem();
    } else if (selectedIdx > indexToDelete) {
      setSelectedIdx((prev) => prev - 1);
    }
  };

  const handleAddNewPO = () => {
    setSelectedIdx(-1);
    setPoFile(null);
    setIsParsed(false);
    setPoStatus('RECEIVED');
    setLineItems([]);
    setEditForm(emptyFormState);
    setPoData({
      orderNo: '',
      customerName: '',
      contractId: '',
      revision: '',
      issuedOn: new Date().toISOString().split('T')[0],
      createdOn: new Date().toISOString().split('T')[0],
      createdBy: '',
      requester: '',
      poEndDate: '',
      totalAmount: 0,
      currency: 'USD',
      intakeStatus: 'RECEIVED',
      shipment: 'Air Freight',
      supplier: null,
      shipTo: null,
      billTo: null,
      deliverTo: null,
      approvalHistory: [],
    });
  };

  const handleSaveOrUpdate = (isResubmission = false) => {
    if (!poData.orderNo?.trim()) {
      alert('Please enter a PO Order Number before saving.');
      return;
    }

    if (lineItems.length === 0) {
      alert('Please add at least one line item before saving.');
      return;
    }

    const firstItem = lineItems[0] || {};
    const averageUnitCost = totalUnits > 0 ? Math.round((grandTotal / totalUnits) * 100) / 100 : 0;
    const currentId = passedRecord?.id || `CPO-${Math.floor(100000 + Math.random() * 900000)}`;

    const city =
      poData.deliverTo?.locationCode?.city ||
      poData.billTo?.city ||
      poData.shipTo?.city ||
      'La Defense';
    const state = poData.deliverTo?.locationCode?.state || poData.billTo?.state || 'PA';
    const country =
      poData.deliverTo?.locationCode?.region ||
      poData.billTo?.country ||
      poData.shipTo?.country ||
      'France';

    const matchedCatalogItem = catalog.find((c: any) =>
      lineItems.some(
        (r) =>
          (r.catalogMatch && c.name?.toLowerCase().includes(r.catalogMatch.toLowerCase())) ||
          (r.partNumber && c.currentGenSku?.toLowerCase() === r.partNumber.toLowerCase())
      )
    );

    const unifiedPoRecord = {
      ...(passedRecord || {}),
      id: currentId,
      poNumber: poData.orderNo.trim(),
      clientName: poData.customerName || poData.billTo?.company || 'Cognizant Internal',
      partNumber: firstItem.partNumber || 'FN4FC',
      catalogItemId: matchedCatalogItem?.id || 'CAT-14STD',
      source: passedRecord?.source || (poFile ? 'PDF_IMPORT' : 'MANUAL_ENTRY'),
      quantity: totalUnits,
      unitCost: averageUnitCost,
      totalAmount: grandTotal,
      shipment: poData.shipment || 'Air Freight',
      city,
      state,
      country,
      status: isResubmission ? 'PENDING_APPROVAL' : passedRecord ? poStatus : 'RECEIVED',
      submittedAt: passedRecord?.submittedAt || new Date().toISOString(),
      fileName: poFile ? poFile.name : passedRecord?.fileName,
      notes: `Supplier: ${poData.supplier?.name || 'N/A'} | Line Items: ${lineItems.length}`,
      ...poData,
      lineItems,
    };

    if (isExistingPO && typeof updatePO === 'function') {
      updatePO(unifiedPoRecord);
    } else if (typeof intakePO === 'function') {
      intakePO(unifiedPoRecord);
    }

    navigate('/po');
  };

  return (
    <div className="pb-20 mx-auto space-y-6 max-w-7xl relative">
      {/* ==================================================== */}
      {/* PDF PARSE SUCCESS TOAST                              */}
      {/* ==================================================== */}
      {showParseSuccess && (
        <div
          className="fixed top-5 right-5 z-[100000] flex items-center gap-3 min-w-[320px] px-4 py-3 bg-white border border-emerald-200 rounded-xl shadow-xl transition-all animate-bounce-short"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">
              Purchase Order details extracted successfully.
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              PO Parsed Successfully.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowParseSuccess(false)}
            className="p-1 text-slate-400 rounded hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* FULL-SCREEN PARSING OVERLAY & PROGRESS BAR           */}
      {/* ==================================================== */}
      {isParsing && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/20 backdrop-blur-[5px] cursor-wait"
          role="status"
          aria-live="polite"
          aria-label="Parsing purchase order"
        >
          <div className="flex flex-col items-center justify-center min-w-[320px] max-w-sm px-8 py-7 bg-white/95 border border-white/80 shadow-2xl rounded-2xl">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            
            <p className="mt-4 text-sm font-bold text-slate-800 text-center">
              Processing Purchase Order
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 text-center">
              Uploading & extracting PO data...
            </p>

            {/* Upload Progress Bar */}
            <div className="w-full mt-5">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mb-1.5">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

                 <p className="mt-5 text-sm font-bold text-slate-800">
              Please wait while we are processing your request.
            </p>
 
            <p className="mt-1 text-xs font-medium text-slate-500">
              Extracting PO data...
            </p>
 
            <p className="mt-3 text-[10px] text-slate-400">
              This may take a few moments.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-800">
              {isExistingPO
                ? `Customer PO: ${passedRecord?.poNumber || passedRecord?.id}`
                : 'Customer PO Intake & Edit'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isApproved
              ? 'This purchase order has been APPROVED. You can view, add, update, and save changes.'
              : isRejected
              ? 'This purchase order was REJECTED. You can edit line items and resubmit for approval.'
              : 'Add new items, update details, and save your Purchase Order.'}
          </p>
        </div>

        {/* Global PO Action Buttons */}
      
      </div>

      {/* 0. Top Upload Section (Only visible during new intake) */}
      {!isExistingPO && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-5 bg-white border shadow-sm border-slate-200 rounded-xl">
            <h2 className="text-sm font-bold text-slate-800">Upload Customer PO PDF</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your PO PDF document to parse and auto-populate all sections.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <label className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white transition-colors bg-indigo-600 rounded-lg shadow-sm cursor-pointer hover:bg-indigo-700">
                <span>{isParsing ? 'Parsing Document...' : 'Upload & Parse PDF'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  disabled={isParsing}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                  }}
                />
              </label>
              {isParsing && (
                <span className="text-xs font-medium text-indigo-600 animate-pulse">
                  Extracting data...
                </span>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Attached:{' '}
              <span className={poFile ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
                {poFile ? poFile.name : 'No file chosen'}
              </span>
            </p>
            {uploadDebug.phase !== 'idle' && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">
                    Request Debug
                  </span>
                  <span className="font-semibold text-slate-700">{uploadDebug.phase}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div>
                    File: <span className="font-medium text-slate-800">{uploadDebug.fileName || 'N/A'}</span>
                  </div>
                  <div>
                    Started: <span className="font-medium text-slate-800">{uploadDebug.startedAt || 'N/A'}</span>
                  </div>
                  <div className="break-all">
                    URL: <span className="font-mono text-slate-800">{uploadDebug.requestUrl || 'N/A'}</span>
                  </div>
                  <div>
                    HTTP Status:{' '}
                    <span className="font-medium text-slate-800">
                      {uploadDebug.responseStatus
                        ? `${uploadDebug.responseStatus} ${uploadDebug.responseStatusText || ''}`
                        : 'No response yet'}
                    </span>
                  </div>
                  {uploadDebug.errorMessage && (
                    <div className="break-words text-rose-600">
                      Error: <span className="font-medium">{uploadDebug.errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-white border shadow-sm border-slate-200 rounded-xl">
            <h2 className="text-sm font-bold text-slate-800">Upload Additional Files</h2>
            <p className="text-xs text-slate-500 mt-0.5">Attach supporting documentation (.msg).</p>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="file"
                disabled={true}
                accept=".msg"
                multiple
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-400 cursor-not-allowed opacity-60"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. PO Header Details */}
      <div className="p-5 space-y-3 bg-white border shadow-sm border-slate-200 rounded-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700">1. PO Header Details</h3>
          </div>
          <span
            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
              isApproved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            Status: {poStatus}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FormField
            label="PO Order No"
            value={poData.orderNo}
            placeholder="e.g. C11183-R1"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, orderNo: val })}
            isMono
          />
          <FormField
            label="Customer Name"
            value={poData.customerName}
            placeholder="Customer company"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, customerName: val })}
          />
          <FormField
            label="Contract ID"
            value={poData.contractId}
            placeholder="Contract ref"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, contractId: val })}
            isMono
          />
          <FormField
            label="Revision"
            value={poData.revision}
            placeholder="Rev #"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, revision: val })}
            isMono
          />
          <FormField
            label="Issued On"
            value={poData.issuedOn ? new Date(poData.issuedOn).toLocaleDateString() : ''}
            placeholder="MM/DD/YYYY"
            readOnly={isReadOnly}
          />
          <FormField
            label="Created On"
            value={poData.createdOn ? new Date(poData.createdOn).toLocaleDateString() : ''}
            placeholder="MM/DD/YYYY"
            readOnly={isReadOnly}
          />
          <FormField
            label="Created By"
            value={poData.createdBy}
            placeholder="Created by user"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, createdBy: val })}
          />
          <FormField
            label="Requester"
            value={poData.requester}
            placeholder="Requester name"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, requester: val })}
          />
          <FormField
            label="PO End Date"
            value={poData.poEndDate ? new Date(poData.poEndDate).toLocaleDateString() : ''}
            placeholder="MM/DD/YYYY"
            readOnly={isReadOnly}
          />
          <FormField
            label="Total Amount"
            value={isParsed || grandTotal > 0 ? `$${grandTotal.toFixed(2)}` : ''}
            placeholder="$0.00"
            readOnly
            isMono
          />
          <FormField
            label="Currency"
            value={poData.currency}
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, currency: val })}
          />
          <FormField
            label="Shipment Mode"
            value={poData.shipment}
            placeholder="e.g. Air Freight"
            readOnly={isReadOnly}
            onChange={(val) => setPoData({ ...poData, shipment: val })}
          />
        </div>
      </div>

      {/* 2. Collapsible Accordion Sections */}
      <div className="space-y-3">
        <AccordionSection title="Supplier Details" accentColor="bg-blue-600" isOpenDefault={false}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Supplier Name" value={poData.supplier?.name} readOnly={isReadOnly} />
            <FormField label="Contact Phone" value={poData.supplier?.phone} readOnly={isReadOnly} />
            <FormField label="Contact Email" value={poData.supplier?.contactEmail} readOnly={isReadOnly} />
            <FormField label="Postal Code" value={poData.supplier?.postalCode} isMono readOnly={isReadOnly} />
            <FormField
              label="Address Line 1"
              value={poData.supplier?.addressLine1}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField label="City" value={poData.supplier?.city} readOnly={isReadOnly} />
            <FormField label="Country" value={poData.supplier?.country} readOnly={isReadOnly} />
            <FormField
              label="Ordering Address"
              value={poData.supplier?.orderingAddress}
              className="md:col-span-4"
              readOnly={isReadOnly}
            />
          </div>
        </AccordionSection>

        <AccordionSection title="Ship To Address" accentColor="bg-indigo-600" isOpenDefault={false}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              label="Facility / Attention"
              value={poData.shipTo?.name}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField label="City" value={poData.shipTo?.city} readOnly={isReadOnly} />
            <FormField label="Country" value={poData.shipTo?.country} readOnly={isReadOnly} />
            <FormField
              label="Address Line 1"
              value={poData.shipTo?.addressLine1}
              className="md:col-span-4"
              readOnly={isReadOnly}
            />
          </div>
        </AccordionSection>

        <AccordionSection title="Bill To Address & Entity" accentColor="bg-emerald-600" isOpenDefault={false}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Billing Entity / Contact" value={poData.billTo?.name} readOnly={isReadOnly} />
            <FormField
              label="Company Name"
              value={poData.billTo?.company}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField label="Postal / ZIP Code" value={poData.billTo?.postalCode} isMono readOnly={isReadOnly} />
            <FormField
              label="Address Line 1"
              value={poData.billTo?.addressLine1}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField label="City" value={poData.billTo?.city} readOnly={isReadOnly} />
            <FormField label="State / Region" value={poData.billTo?.state} readOnly={isReadOnly} />
            <FormField label="Country" value={poData.billTo?.country} readOnly={isReadOnly} />
          </div>
        </AccordionSection>

        <AccordionSection title="Deliver To Details" accentColor="bg-purple-600" isOpenDefault={false}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <FormField label="Deliver To Email" value={poData.deliverTo?.email} readOnly={isReadOnly} />
            <FormField label="GL Business Unit" value={poData.deliverTo?.glBusinessUnit} readOnly={isReadOnly} />
            <FormField label="Asset Classification" value={poData.deliverTo?.asset} readOnly={isReadOnly} />
            <FormField label="Location ID" value={poData.deliverTo?.locationCode?.id} isMono readOnly={isReadOnly} />
            <FormField
              label="Location Name"
              value={poData.deliverTo?.locationCode?.name}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField
              label="Location Description"
              value={poData.deliverTo?.locationCode?.description}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField
              label="Physical Address"
              value={poData.deliverTo?.locationCode?.address}
              className="md:col-span-2"
              readOnly={isReadOnly}
            />
            <FormField label="City" value={poData.deliverTo?.locationCode?.city} readOnly={isReadOnly} />
            <FormField label="State" value={poData.deliverTo?.locationCode?.state} readOnly={isReadOnly} />
            <FormField
              label="Postal Code"
              value={poData.deliverTo?.locationCode?.postalCode}
              isMono
              readOnly={isReadOnly}
            />
            <FormField label="Region" value={poData.deliverTo?.locationCode?.region} readOnly={isReadOnly} />
            <FormField label="Location Status" value={poData.deliverTo?.locationCode?.status} readOnly={isReadOnly} />
          </div>
        </AccordionSection>
      </div>

      {/* 3. Line Item Details Section */}
      <div className="p-5 space-y-5 bg-white border shadow-sm border-slate-200 rounded-xl">
        <div className="flex flex-col justify-between gap-2 pb-3 border-b sm:flex-row sm:items-center border-slate-100">
          <div>
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700">
              3. Line Item Details ({lineItems.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select any row to populate and update it, or click "+ New Line Item" to enter and add new details.
            </p>
          </div>
         
        </div>

        {/* Line Item Form Editor */}
        <div className="p-4 space-y-4 border bg-slate-50 border-slate-200 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold tracking-wider uppercase text-slate-700">
                {selectedIdx >= 0 ? (
                  <>
                    Editing Row #{selectedIdx + 1}:{' '}
                    <span className="font-mono text-indigo-600">{lineItems[selectedIdx]?.partNumber}</span>
                  </>
                ) : (
                  <span className="text-emerald-700">Adding New Line Item</span>
                )}
              </h4>
              <span className="text-[11px] text-slate-500">
                {selectedIdx >= 0
                  ? 'Row data loaded. Change fields and click "Update Line Item".'
                  : 'Fill in the details below and click "Add Line Item" to insert.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-4">
            <div>
              <label className="block mb-1 font-semibold text-slate-600">
                Part Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. FN4FC"
                value={editForm.partNumber || ''}
                onChange={(e) => handleEditChange('partNumber', e.target.value)}
                className="w-full px-3 py-2 font-mono bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Catalog Part</label>
              <select
                value={editForm.catalogMatch || ''}
                onChange={(e) => handleEditChange('catalogMatch', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Catalog Match --</option>
                <option value="FN4FC">FN4FC - Dell Networking Cable QSFP28</option>
                <option value="C2ZK6EC">C2ZK6EC - HP EliteBook X Flip G2i AI</option>
                <option value="APP-MBP16">APP-MBP16 - Apple MacBook Pro 16 M3</option>
                <option value="LEN-T14">LEN-T14 - Lenovo ThinkPad T14 Gen 4</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Entity Name</label>
              <input
                type="text"
                placeholder="Entity Name"
                value={editForm.entityName || ''}
                onChange={(e) => handleEditChange('entityName', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Entity Code</label>
              <input
                type="text"
                placeholder="Location / Org Code"
                value={editForm.entityCode || ''}
                onChange={(e) => handleEditChange('entityCode', e.target.value)}
                className="w-full px-3 py-2 font-mono bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Units</label>
              <input
                type="number"
                min="1"
                value={editForm.quantity || ''}
                onChange={(e) => handleEditChange('quantity', e.target.value)}
                className="w-full px-3 py-2 font-bold bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Unit Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.unitPrice ?? ''}
                onChange={(e) => handleEditChange('unitPrice', e.target.value)}
                className="w-full px-3 py-2 font-mono bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Total Cost</label>
              <input
                readOnly
                value={`$${Number(editForm.amount || 0).toFixed(2)}`}
                className="w-full px-3 py-2 font-mono font-bold border rounded-md bg-slate-100 border-slate-200 text-slate-700"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-slate-600">Billing Method</label>
              <select
                value={editForm.billingMethod || 'Monthly'}
                onChange={(e) => handleEditChange('billingMethod', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 pt-2">
            {selectedIdx >= 0 && (
              <button
                type="button"
                onClick={handleStartAddNewItem}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmAddItem}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              + Add Line Item
            </button>

            <button
              type="button"
              onClick={handleUpdateLineItem}
              disabled={selectedIdx < 0}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors ${
                selectedIdx >= 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              Update Line Item
            </button>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto border rounded-lg border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="font-semibold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                <th className="py-2.5 px-3">Part Number</th>
                <th className="py-2.5 px-3">Catalog Match</th>
                <th className="py-2.5 px-3">Entity / Code</th>
                <th className="py-2.5 px-3 text-center">Units</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Billing</th>
                <th className="py-2.5 px-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`transition-colors cursor-pointer hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <td className="px-3 py-3 font-mono font-semibold text-indigo-700">{item.partNumber}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-emerald-600">
                      {item.catalogMatch || item.partNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="max-w-xs font-medium truncate">{item.entityName || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.entityCode || '—'}</div>
                    </td>
                    <td className="px-3 py-3 font-bold text-center text-slate-800">{item.quantity}</td>
                    <td className="px-3 py-3 font-mono text-right text-slate-600">
                      ${Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-right text-slate-900">
                      ${Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.billingMethod || 'Monthly'}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRow(e, idx)}
                        className="p-1 transition-colors rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Delete row"
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!lineItems.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No line items available. Use the form above to add items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {lineItems.length > 0 && (
          <div className="flex items-center justify-between px-1 pt-1 text-xs font-semibold text-slate-700">
            <div>
              Total Units: <span className="text-slate-900">{totalUnits}</span>
            </div>
            <div>
              Grand Total:{' '}
              <span className="font-mono text-sm font-bold text-indigo-700">
                ${grandTotal.toFixed(2)} USD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => navigate('/po')}
          className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm cursor-pointer transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSaveOrUpdate(false)}
          className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer transition-colors"
        >
          {isExistingPO ? 'Save Changes' : 'Save Customer PO'}
        </button>
      </div>

      {/* Mandatory Remarks & Justification Approval Modal */}
      {approvalModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-white border rounded-2xl border-slate-200 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              {approvalModal.action === 'APPROVED' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
            </h3>
            <p className="text-xs text-slate-500">
              Remarks and justification are mandatory for approval actions.
            </p>

            {approvalModal.error && (
              <div className="p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
                {approvalModal.error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700">
                  Remarks <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified and approved against Master Services Agreement"
                  value={approvalModal.remarks}
                  onChange={(e) =>
                    setApprovalModal({ ...approvalModal, remarks: e.target.value, error: '' })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700">
                  Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Budget approved under Q3 procurement allocation"
                  value={approvalModal.justification}
                  onChange={(e) =>
                    setApprovalModal({ ...approvalModal, justification: e.target.value, error: '' })
                  }
                  className="w-full px-3 py-2 text-xs border rounded-lg border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModal({ ...approvalModal, isOpen: false })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {}}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer ${
                  approvalModal.action === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {approvalModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}