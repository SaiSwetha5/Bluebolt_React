export interface PoUploadApiResponse {
  success: boolean;
  data: {
    orderNo: string;
    contractId?: string;
    revision?: string;
    issuedOn?: string;
    createdOn?: string;
    createdBy?: string;
    requester?: string;
    poEndDate?: string;
    totalAmount?: number;
    currency?: string;
    intakeStatus?: string;
    supplier?: {
      name?: string;
      addressLine1?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      phone?: string;
      contactEmail?: string;
      orderingAddress?: string;
    };
    shipTo?: {
      name?: string;
      addressLine1?: string;
      city?: string;
      country?: string;
    };
    billTo?: {
      name?: string;
      company?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    deliverTo?: {
      email?: string;
      glBusinessUnit?: string;
      asset?: string;
      locationCode?: {
        id?: string;
        name?: string;
        description?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        status?: string;
        region?: string;
      };
    };
    lineItems?: Array<{
      lineNo: number;
      description?: string;
      fullDescription?: string;
      partNumber?: string;
      quantity?: number;
      uom?: string;
      needByDate?: string;
      unitPrice?: number;
      netAmount?: number;
      amount?: number;
      currency?: string;
    }>;
    documents?: any[];
  };
  timestamp?: string;
}