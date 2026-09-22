/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

interface APIConfig {
  baseUrl: string;
  apiVersion: string;
  endpoints: {
    poExtract: string;
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
 * Get GRN API URL
 */
export const getGRNUrl = (): string => getApiUrl(config.endpoints.grnList);

/**
 * Get Invoice API URL
 */
export const getInvoiceUrl = (): string => getApiUrl(config.endpoints.invoiceList);

export default config;
