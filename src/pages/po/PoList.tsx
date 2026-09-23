import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useData } from '../../store/DataContext';
import type { PoStatus } from '../../types/models';

const FILTERS: ('ALL' | PoStatus)[] = [
  'ALL', 
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
];

export default function PoList() {
  const { purchaseOrders = [] } = useData();
  const navigate = useNavigate();

  const [active, setActive] = useState<'ALL' | PoStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status filter
  const statusFiltered = useMemo(() => {
    return active === 'ALL'
      ? purchaseOrders
      : purchaseOrders.filter((p: any) => p.status === active);
  }, [purchaseOrders, active]);

  // Search filter
  const filtered = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    if (!searchValue) {
      return statusFiltered;
    }

    return statusFiltered.filter((po: any) => {
      const submittedDate = po.submittedAt
        ? new Date(po.submittedAt)
            .toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            .toLowerCase()
        : '';

      const source =
        po.source === 'PDF_IMPORT'
          ? 'pdf import'
          : 'api integration';

      const totalAmount = Number(
        po.totalAmount || po.quantity * po.unitCost || 0
      ).toString();

      return (
        String(po.id ?? '').toLowerCase().includes(searchValue) ||
        String(po.poNumber ?? '').toLowerCase().includes(searchValue) ||
        String(po.clientName ?? '').toLowerCase().includes(searchValue) ||
        source.includes(searchValue) ||
        String(po.quantity ?? '').toLowerCase().includes(searchValue) ||
        String(po.unitCost ?? '').toLowerCase().includes(searchValue) ||
        totalAmount.includes(searchValue) ||
        submittedDate.includes(searchValue)
      );
    });
  }, [statusFiltered, searchTerm]);

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedData = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  const visiblePages = useMemo(() => {
    const actualTotalPages = Math.ceil(totalItems / pageSize);

    if (actualTotalPages === 0) {
      return [];
    }

    let startPage = Math.max(currentPage - 2, 1);
    let endPage = Math.min(startPage + 4, actualTotalPages);

    if (endPage - startPage < 4) {
      startPage = Math.max(endPage - 4, 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [currentPage, totalItems, pageSize]);

  const handleFilterChange = (filter: 'ALL' | PoStatus) => {
    setActive(filter);
    setCurrentPage(1);
  };

  const handleNavigateToCustomerIntake = (po: any) => {
    navigate('/po/customImport', { state: { poRecord: po } });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Customer Purchase Orders
          </h1>
          <p className="text-sm text-slate-500">
            Intake, acknowledgment and approval queue for customer POs.
          </p>
        </div>

        <Link
          to="/po/customImport"
          className="a360-btn-primary self-start sm:self-auto"
        >
          + New Customer PO Intake
        </Link>
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 bg-white border rounded-xl border-slate-200 shadow-sm">
        <div className="relative w-full lg:w-56 flex-shrink-0">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="a360-input pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count =
              f === 'ALL'
                ? purchaseOrders.length
                : purchaseOrders.filter((po: any) => po.status === f).length;

            return (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  active === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'ALL'
                  ? `All (${count})`
                  : `${f.replace(/_/g, ' ')} (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border rounded-xl border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 min-w-[140px]">Customer PO ID</th>
                <th className="py-3 px-4 min-w-[150px]">Customer PO Number</th>
                <th className="py-3 px-4 min-w-[180px]">Client</th>
                <th className="py-3 px-4 min-w-[130px]">Source</th>
                <th className="py-3 px-4 text-center min-w-[80px]">Qty</th>
                <th className="py-3 px-4 text-right min-w-[110px]">Unit Cost</th>
                <th className="py-3 pl-4 pr-8 text-right min-w-[150px]">Total Amount</th>
                <th className="py-3 pl-4 pr-6 text-left min-w-[140px]">Submitted</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((po: any) => {
                return (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    {/* Customer PO ID */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleNavigateToCustomerIntake(po)}
                        className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-left"
                      >
                        {po.id}
                      </button>
                    </td>

                    {/* Customer PO Number */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <button
                        type="button"
                        onClick={() => handleNavigateToCustomerIntake(po)}
                        className="font-medium text-slate-800 hover:text-indigo-600 hover:underline cursor-pointer text-left"
                      >
                        {po.poNumber}
                      </button>
                    </td>

                    {/* Client */}
                    <td className="py-3 px-4 text-slate-700">
                      {po.clientName}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 text-slate-500">
                      {po.source === 'PDF_IMPORT'
                        ? 'PDF Import'
                        : 'API Integration'}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {po.quantity}
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ${Number(po.unitCost || 0).toLocaleString()}
                    </td>

                    {/* Total Amount (Extra right padding pr-8 prevents overlap) */}
                    <td className="py-3 pl-4 pr-8 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      ${Number(
                        po.totalAmount ||
                          po.quantity * po.unitCost ||
                          0
                      ).toLocaleString()}
                    </td>

                    {/* Submitted (Clean left aligned pl-4 with whitespace-nowrap) */}
                    <td className="py-3 pl-4 pr-6 text-left text-slate-500 whitespace-nowrap">
                      {po.submittedAt
                        ? new Date(po.submittedAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )
                        : '—'}
                    </td>
                  </tr>
                );
              })}

              {filtered.length < 1 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    NO CUSTOMER PURCHASE ORDERS FOUND
                    {active !== 'ALL' && (
                      <div className="text-sm text-slate-400 mt-1">
                        No records available for status:{' '}
                        {active.replace(/_/g, ' ')}
                      </div>
                    )}
                    {searchTerm && (
                      <div className="text-sm text-slate-400 mt-1">
                        No records match your search: "{searchTerm}"
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded-lg px-3 py-2 text-sm bg-white border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {totalItems === 0
                  ? '0-0 of 0'
                  : `${startIndex + 1}-${Math.min(
                      endIndex,
                      totalItems
                    )} of ${totalItems}`}
              </span>

              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                «
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="text-xl px-2 disabled:opacity-40 cursor-pointer"
              >
                ‹
              </button>

              <div className="flex gap-2">
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-full transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="text-xl px-2 disabled:opacity-40 cursor-pointer"
              >
                ›
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}