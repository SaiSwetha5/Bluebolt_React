/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

interface APIConfig {
  baseUrl: string;
  apiVersion: string;
  endpoints: {
    poExtract: string;
    purchaseOrders: string;
    grnList: string;
    invoiceList: string;
  };
}

// Build full URLs from environment variables
const config: APIConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  apiVersion: import.meta.env.VITE_API_VERSION || 'v1',
  endpoints: {
    poExtract: import.meta.env.VITE_PO_EXTRACT_ENDPOINT || '/api/v1/purchase-orders/extract-po-pdf',
    purchaseOrders: import.meta.env.VITE_PURCHASE_ORDERS_ENDPOINT || '/api/v1/purchase-orders',
    grnList: import.meta.env.VITE_GRN_ENDPOINT || '/api/v1/goods-receipt',
    invoiceList: import.meta.env.VITE_INVOICE_ENDPOINT || '/api/v1/invoices',
  },
};

/**
 * Get full API URL
 * @param endpoint - The endpoint path
 * @returns Full URL
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
  return `${baseUrl}${endpoint}`;
};

/**
 * Get PO Extract API URL
 */
export const getPOExtractUrl = (): string => getApiUrl(config.endpoints.poExtract);

/**
 * Get Purchase Orders List API URL with pagination and sorting
 * @param page 0-indexed page number
 * @param size Page size limit
 * @param sort Sort parameter string (e.g., "Id,asc")
 */
export const getPOListUrl = (page: number, size: number, sort: string): string => {
  const sortParam = encodeURIComponent(JSON.stringify([sort]));
  return `${getApiUrl(config.endpoints.purchaseOrders)}?page=${page}&size=${size}&sort=${sortParam}`;
};

/**
 * Get Single Purchase Order API URL by ID
 * @param id PO entity identifier
 */
export const getPurchaseOrderByIdUrl = (id: string | number): string =>
  `${getApiUrl(config.endpoints.purchaseOrders)}/${id}`;

/**
 * Get GRN API URL
 */
export const getGRNUrl = (): string => getApiUrl(config.endpoints.grnList);

/**
 * Get Invoice API URL
 */
export const getInvoiceUrl = (): string => getApiUrl(config.endpoints.invoiceList);

export default config;