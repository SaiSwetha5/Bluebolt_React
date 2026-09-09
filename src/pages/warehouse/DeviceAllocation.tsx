import React, { useState, useMemo } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

// Interfaces for enterprise allocation payload
export interface AllocationPayload {
  assetId: string;
  serialNumber: string;
  model: string;
  employeeId: string;
  recipientName: string;
  recipientEmail: string;
  department: string;
  costCenter: string;
  customerEntity: string;
  customerPoRef: string;
  ticketRef: string;
  deliveryMethod: 'DIRECT_OFFICE' | 'COURIER_SHIPMENT';
  buildingFloorDesk?: string;
  shippingAddress?: string;
  courierCarrier?: string;
  courierTracking?: string;
  provisioningProfile: 'WINDOWS_AUTOPILOT' | 'INTUNE_CORP' | 'JAMF_MAC_CORP' | 'LINUX_STAGING';
allocatedDate: string;
warrantyStartDate: string;
targetLeaseDate: string;
targetRefreshDate: string;
notes?: string;
}

type StatusFilterType = 'ALL' | 'IN_STOCK' | 'ALLOCATED';

// Helper to determine if an asset is considered "In Stock" vs "Allocated"
export function isDeviceAllocated(asset: any): boolean {
  if (!asset) return false;

  const rawStatus = (asset.lifecycleStatus || asset.status || '').toString().toUpperCase().trim();

  // Known allocated statuses
  const allocatedKeywords = ['ALLOCATED', 'IN_USE', 'IN USE', 'ASSIGNED', 'DEPLOYED', 'DISPATCHED', 'STAGED'];
  if (allocatedKeywords.includes(rawStatus)) {
    return true;
  }

  // If it has an active user assigned, it's allocated regardless of status string
  if (asset.assignedTo && typeof asset.assignedTo === 'string' && asset.assignedTo.trim() !== '') {
    return true;
  }
  if (asset.employeeId || asset.recipientName) {
    return true;
  }

  // If status explicitly says IN_STOCK or AVAILABLE, it's not allocated
  if (rawStatus === 'IN_STOCK' || rawStatus === 'IN STOCK' || rawStatus === 'AVAILABLE') {
    return false;
  }

  return false;
}

export function isDeviceInStock(asset: any): boolean {
  if (!asset) return false;
  const rawStatus = (asset.lifecycleStatus || asset.status || '').toString().toUpperCase().trim();
  
  // If explicitly in stock and doesn't have an active user assigned
  if (rawStatus === 'IN_STOCK' || rawStatus === 'IN STOCK' || rawStatus === 'AVAILABLE') {
    return !asset.assignedTo;
  }

  // Otherwise, if it's not allocated, treat as stock
  return !isDeviceAllocated(asset);
}

export default function DeviceAllocation() {
  const { assets = [], assignAsset } = useData();
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('IN_STOCK');

  // Form State for Allocation Modal
  const [formData, setFormData] = useState<AllocationPayload>({
    assetId: '',
    serialNumber: '',
    model: '',
    employeeId: '',
    recipientName: '',
    recipientEmail: '',
    department: 'Engineering',
    costCenter: 'CC-ENG-402',
    customerEntity: 'Cognizant Internal',
    customerPoRef: 'PO-2026-00424',
    ticketRef: 'REQ-2026-',
    deliveryMethod: 'DIRECT_OFFICE',
    buildingFloorDesk: 'Campus 2, Tower B, 4th Floor',
    shippingAddress: '',
    courierCarrier: 'FedEx Priority',
    courierTracking: '',
 provisioningProfile: 'WINDOWS_AUTOPILOT',

allocatedDate: new Date().toISOString().split('T')[0],

warrantyStartDate: new Date().toISOString().split('T')[0],

targetLeaseDate: new Date(
  new Date().setFullYear(new Date().getFullYear() + 3)
)
  .toISOString()
  .split('T')[0],

targetRefreshDate: new Date(
  new Date().setFullYear(new Date().getFullYear() + 4)
)
  .toISOString()
  .split('T')[0],

notes: '',
  });

  // Accurate Dynamic Counts
  const inStockCount = useMemo(
    () => assets.filter((a: any) => isDeviceInStock(a)).length,
    [assets]
  );

  const allocatedCount = useMemo(
    () => assets.filter((a: any) => isDeviceAllocated(a)).length,
    [assets]
  );

  // Filtered asset list
  const filteredAssets = useMemo(() => {
    return assets.filter((a: any) => {
      // 1. Status Filter Check
      let matchesStatus = true;
      if (statusFilter === 'IN_STOCK') {
        matchesStatus = isDeviceInStock(a);
      } else if (statusFilter === 'ALLOCATED') {
        matchesStatus = isDeviceAllocated(a);
      }

      // 2. Search Text Check
      const targetString = [
        a.assetId,
        a.serialNumber,
        a.model,
        a.assignedTo,
        a.recipientName,
        a.employeeId,
        a.location,
        a.lifecycleStatus,
        a.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || targetString.includes(search.toLowerCase().trim());

      return matchesStatus && matchesSearch;
    });
  }, [assets, search, statusFilter]);

 

  function openAllocationModal(asset: any) {
    setSelectedAsset(asset);
    setFormData((prev) => ({
      ...prev,
      assetId: asset.assetId,
      serialNumber: asset.serialNumber,
      model: asset.model,
      ticketRef: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
    }));
  }

  function closeModal() {
    setSelectedAsset(null);
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmitAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.recipientName || !formData.employeeId || !formData.costCenter) {
      alert('Please fill in all mandatory fields (Employee ID, Name, Cost Center).');
      return;
    }

    if (typeof assignAsset === 'function') {
      assignAsset(
        formData.assetId,
        `${formData.recipientName} (${formData.employeeId})`,
        formData.deliveryMethod === 'DIRECT_OFFICE'
          ? formData.buildingFloorDesk || 'Office Desk'
          : `Shipped: ${formData.courierTracking || 'Pending Tracking'}`,
        {
          ...formData,
          lifecycleStatus: 'ALLOCATED',
          status: 'ALLOCATED',
        }
      );
    }

    closeModal();
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Device Allocation &amp; Staging Dispatch
          </h1>
          <p className="text-sm text-slate-500">
            Assign verified warehouse inventory to end users, departments, and client entities with cost-center tracking.
          </p>
        </div>

        {/* Status Counters & File Download */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('IN_STOCK')}
            className={`px-3 py-1 text-xs font-semibold border rounded-full transition-colors cursor-pointer ${
              statusFilter === 'IN_STOCK'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Stock Ready: {inStockCount} Units
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALLOCATED')}
            className={`px-3 py-1 text-xs font-semibold border rounded-full transition-colors cursor-pointer ${
              statusFilter === 'ALLOCATED'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            Allocated: {allocatedCount} Units
          </button>

      
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border rounded-lg shadow-sm a360-card border-slate-200">
        <div className="flex flex-wrap items-center w-full gap-3 md:w-auto">
          <input
            className="a360-input w-full md:w-80 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search Asset ID, Serial, Model, Assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Quick Segment Filter Pill */}
          <div className="inline-flex p-0.5 border border-slate-200 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('IN_STOCK')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'IN_STOCK'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Stock ({inStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALLOCATED')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALLOCATED'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Allocated ({allocatedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Show All ({assets.length})
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredAssets.length}</strong>{' '}
          {statusFilter === 'ALLOCATED' ? 'allocated' : statusFilter === 'IN_STOCK' ? 'available' : 'total'} devices
        </div>
      </div>

      {/* Assets Table */}
      <div className="overflow-hidden bg-white border rounded-lg shadow-sm a360-card border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                <th className="px-4 py-3">Asset ID</th>
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Device Model</th>
                <th className="px-4 py-3">Location / Assigned To</th>
                <th className="px-4 py-3">Lifecycle</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredAssets.map((asset: any) => {
                const isAllocated = isDeviceAllocated(asset);

                return (
                  <tr key={asset.assetId || asset.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">
                      {asset.assetId || asset.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {asset.serialNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {asset.model}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAllocated ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}
                        ></span>
                        <div className="flex flex-col">
                          <span>{asset.location || (isAllocated ? 'Deployed' : 'Cognizant Warehouse')}</span>
                          {(asset.assignedTo || asset.recipientName) && (
                            <span className="text-xs font-medium text-slate-600">
                              Assigned to: {asset.assignedTo || asset.recipientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={isAllocated ? (asset.lifecycleStatus || 'ALLOCATED') : (asset.lifecycleStatus || 'IN_STOCK')} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAllocated ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md">
                          Allocated
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAllocationModal(asset)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                        >
                          Allocate &amp; Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!filteredAssets.length && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-base font-medium">No devices match your criteria.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {statusFilter === 'ALLOCATED' && allocatedCount === 0
                        ? 'There are currently 0 allocated devices. Allocate an in-stock device first.'
                        : 'Try adjusting your search keywords or switching filters.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Allocate Asset: <span className="font-mono text-blue-600">{selectedAsset.assetId}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedAsset.model} &bull; S/N: <span className="font-mono">{selectedAsset.serialNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitAllocation} className="p-6 space-y-6 overflow-y-auto text-sm">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  1. Recipient &amp; Cost Center Attribution
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Employee ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      placeholder="e.g. CGZ-98124"
                      className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Employee Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Corporate Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      name="recipientEmail"
                      value={formData.recipientEmail}
                      onChange={handleInputChange}
                      placeholder="alex.morgan@cognizant.com"
                      className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Cloud & DevOps">Cloud &amp; DevOps</option>
                      <option value="IT Security & Ops">IT Security &amp; Ops</option>
                      <option value="Corporate Human Resources">Corporate HR</option>
                      <option value="Finance & Procurement">Finance &amp; Procurement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Customer Entity / Tenant
                    </label>
                    <input
                      name="customerEntity"
                      value={formData.customerEntity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  2. Order &amp; Requisition Alignment
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Linked Customer PO / Project Ref
                    </label>
                    <input
                      name="customerPoRef"
                      value={formData.customerPoRef}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 font-mono border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-slate-700">
                      Service Ticket / Requisition ID
                    </label>
                    <input
                      name="ticketRef"
                      value={formData.ticketRef}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 font-mono border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

          <div>
  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
    3. Lifecycle Dates
  </h3>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div>
      <label className="block mb-1 text-xs font-semibold text-slate-700">
        Allocation Start Date
      </label>
      <input
        type="date"
        name="allocatedDate"
        value={formData.allocatedDate}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>

    <div>
      <label className="block mb-1 text-xs font-semibold text-slate-700">
        Warranty Start Date
      </label>
      <input
        type="date"
        name="warrantyStartDate"
        value={formData.warrantyStartDate}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>

  

    <div>
      <label className="block mb-1 text-xs font-semibold text-slate-700">
        Target Lease Refresh / LRM Date
      </label>
      <input
        type="date"
        name="targetRefreshDate"
        value={formData.targetRefreshDate}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border rounded-md border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  </div>
</div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold transition-colors rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}