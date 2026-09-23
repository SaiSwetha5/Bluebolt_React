import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { LIST_OF_PO_MOCK } from '../../mocks/LIST_OF_PO_MOCK';
import type { PoStatus } from '../../types/models';

// Self-contained API URL helpers (no external import required)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getPOListUrl = (page: number, size: number, sort: string): string => {
  const sortParam = encodeURIComponent(JSON.stringify([sort]));
  return `${API_BASE_URL}/api/v1/purchase-orders?page=${page}&size=${size}&sort=${sortParam}`;
};

const getPurchaseOrderByIdUrl = (id: string | number): string =>
  `${API_BASE_URL}/api/v1/purchase-orders/${id}`;

const FILTERS: ('ALL' | PoStatus)[] = [
  'ALL',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
];

export default function PoList() {
  const navigate = useNavigate();

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-row loading state when fetching single PO details
  const [activeLoadingId, setActiveLoadingId] = useState<string | number | null>(null);

  // Dynamic Pagination & Sort States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [active, setActive] = useState<'ALL' | PoStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      setError(null);

      const apiPage = currentPage - 1;
      const requestUrl = getPOListUrl(apiPage, pageSize, `${sortField},${sortDirection}`);

      try {
        let json: any;

        // --- TOGGLE LINE: Comment this out to switch directly to the real API ---
        json = LIST_OF_PO_MOCK;
        // ------------------------------------------------------------------------

        const isMockActive = Boolean(json);

        if (!json) {
          const response = await fetch(requestUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) {
            throw new Error(`Server status: ${response.status} ${response.statusText}`);
          }
          json = await response.json();
        }

        const allContent = json?.data?.content || json?.content || [];
        const total = json?.data?.totalElements ?? json?.totalElements ?? allContent.length;
        const pages = json?.data?.totalPages ?? json?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

        const content =
          isMockActive && allContent.length > pageSize
            ? allContent.slice(apiPage * pageSize, apiPage * pageSize + pageSize)
            : allContent;

        const mapped = content.map((item: any) => {
          const calculatedQty = item.lineItems?.reduce(
            (acc: number, li: any) => acc + (Number(li.quantity) || 0),
            0
          );
          const firstLinePrice = item.lineItems?.[0]?.unitPrice;

          return {
            ...item,
            id: item.id || '—',
            poNumber: item.orderNo || item.poNumber || '—',
            clientName: item.supplier?.name || item.customerName || item.clientName || '—',
            source: item.sourceFileName ? 'PDF Import' : 'API Integration',
            quantity: calculatedQty || item.quantity || 0,
            unitCost: firstLinePrice !== undefined ? firstLinePrice : item.unitCost || 0,
            totalAmount: item.totalAmount || 0,
            submittedAt: item.issuedOn || item.createdOn || item.submittedAt || null,
            endDate: item.poEndDate || item.endDate || null,
            status:
              item.intakeStatus === 'PARSED'
                ? 'APPROVED'
                : item.intakeStatus || item.status || 'APPROVED',
          };
        });

        setPurchaseOrders(mapped);
        setTotalItems(total);
        setTotalPages(pages);
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError(err.message || 'Failed to fetch purchase orders');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [currentPage, pageSize, sortField, sortDirection]);

  // Single PO Fetch Trigger
  const handleNavigateToCustomerIntake = async (po: any) => {
    const targetId = po.id !== '—' ? po.id : po.poNumber;

    try {
      setActiveLoadingId(po.id);

      const response = await fetch(getPurchaseOrderByIdUrl(targetId), {
        method: 'GET',
        headers: { accept: '*/*' },
      });

      if (!response.ok) {
        throw new Error(`Status: ${response.status} ${response.statusText}`);
      }

      const poData = await response.json();
      const detailedRecord = poData?.data ?? poData;

      navigate('/po/customImport', { state: { poRecord: detailedRecord } });
    } catch (err) {
      console.warn('Direct PO fetch failed, using list state fallback:', err);
      navigate('/po/customImport', { state: { poRecord: po } });
    } finally {
      setActiveLoadingId(null);
    }
  };

  // Status Filter
  const statusFiltered = useMemo(() => {
    return active === 'ALL'
      ? purchaseOrders
      : purchaseOrders.filter((p: any) => p.status === active);
  }, [purchaseOrders, active]);

  // Search Filter
  const filtered = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();
    if (!searchValue) return statusFiltered;

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

      const endDateFormatted = po.endDate
        ? new Date(po.endDate)
            .toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            .toLowerCase()
        : '';

      return (
        String(po.id ?? '').toLowerCase().includes(searchValue) ||
        String(po.poNumber ?? '').toLowerCase().includes(searchValue) ||
        String(po.clientName ?? '').toLowerCase().includes(searchValue) ||
        String(po.source ?? '').toLowerCase().includes(searchValue) ||
        String(po.quantity ?? '').toLowerCase().includes(searchValue) ||
        String(po.unitCost ?? '').toLowerCase().includes(searchValue) ||
        String(po.totalAmount ?? '').toLowerCase().includes(searchValue) ||
        submittedDate.includes(searchValue) ||
        endDateFormatted.includes(searchValue)
      );
    });
  }, [statusFiltered, searchTerm]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const visiblePages = useMemo(() => {
    if (totalPages === 0) return [];
    let startPage = Math.max(currentPage - 2, 1);
    let endPage = Math.min(startPage + 4, totalPages);

    if (endPage - startPage < 4) {
      startPage = Math.max(endPage - 4, 1);
    }

    return Array.from(
      { length: Math.min(endPage - startPage + 1, totalPages) },
      (_, index) => startPage + index
    );
  }, [currentPage, totalPages]);

  const handleFilterChange = (filter: 'ALL' | PoStatus) => {
    setActive(filter);
    setCurrentPage(1);
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
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors self-start sm:self-auto"
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
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                type="button"
                onClick={() => handleFilterChange(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
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
          <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th
                  className="py-3 px-4 min-w-[140px] cursor-pointer hover:bg-slate-100"
                  onClick={() => {
                    setSortField('Id');
                    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  CUSTOMER PO ID {sortField === 'Id' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4 min-w-[150px]">CUSTOMER PO NUMBER</th>
                <th className="py-3 px-4 min-w-[180px]">CLIENT</th>
                <th className="py-3 px-4 min-w-[130px]">SOURCE</th>
                <th className="py-3 px-4 text-center min-w-[80px]">QTY</th>
                <th className="py-3 px-4 text-right min-w-[110px]">UNIT COST</th>
                <th className="py-3 pl-4 pr-8 text-right min-w-[150px]">TOTAL AMOUNT</th>
                <th className="py-3 pl-4 pr-4 text-left min-w-[130px]">SUBMITTED</th>
                <th className="py-3 pl-4 pr-6 text-left min-w-[130px]">PO END DATE</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium">Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-rose-500 font-medium">
                    <div>Failed to load purchase orders</div>
                    <div className="text-xs text-rose-400 mt-1">{error}</div>
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((po: any) => {
                    const isRowLoading = activeLoadingId === po.id;
                    return (
                      <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={isRowLoading}
                            onClick={() => handleNavigateToCustomerIntake(po)}
                            className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-left inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isRowLoading && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
                            <span>{po.id}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-800">
                          <button
                            type="button"
                            disabled={isRowLoading}
                            onClick={() => handleNavigateToCustomerIntake(po)}
                            className="font-medium text-slate-800 hover:text-indigo-600 hover:underline cursor-pointer text-left inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isRowLoading && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
                            <span>{po.poNumber}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-slate-700">{po.clientName}</td>

                        <td className="py-3 px-4 text-slate-500">{po.source}</td>

                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {po.quantity}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ${Number(po.unitCost || 0).toLocaleString()}
                        </td>

                        <td className="py-3 pl-4 pr-8 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ${Number(po.totalAmount || 0).toLocaleString()}
                        </td>

                        <td className="py-3 pl-4 pr-4 text-left text-slate-500 whitespace-nowrap">
                          {po.submittedAt
                            ? new Date(po.submittedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="py-3 pl-4 pr-6 text-left text-slate-500 whitespace-nowrap">
                          {po.endDate
                            ? new Date(po.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length < 1 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-500 font-medium"
                      >
                        NO CUSTOMER PURCHASE ORDERS FOUND
                        {active !== 'ALL' && (
                          <div className="text-sm text-slate-400 mt-1">
                            No records available for status: {active.replace(/_/g, ' ')}
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
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Controls */}
        {!loading && filtered.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded-md px-2 py-1 text-xs bg-white border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">
                {totalItems === 0
                  ? '0-0 of 0'
                  : `${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}`}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded text-xs disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                «
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded text-xs disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                ‹
              </button>

              <div className="flex gap-1">
                {visiblePages.map((page) => (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded text-xs transition cursor-pointer font-semibold ${
                      currentPage === page
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded text-xs disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                ›
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded text-xs disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
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