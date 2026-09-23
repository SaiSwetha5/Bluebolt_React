export const LIST_OF_PO_MOCK = {
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "orderNo": "PO515366",
        "contractId": null,
        "revision": null,
        "issuedOn": "2024-12-30T00:00:00Z",
        "createdOn": "2024-12-30T00:00:00Z",
        "createdBy": "Kanchi Reddy Anusha (488611)",
        "requester": "Kanchi Reddy Anusha (488611)",
        "poEndDate": "2027-12-26T00:00:00Z",
        "totalAmount": 229840,
        "currency": "USD",
        "comments": "Customer Purchase Order submitted from Asset360.",
        "intakeStatus": "PARSED",
        "sourceFileName": "Sample PO.pdf",
        "supplier": {
          "name": "NEXTHINK SA - USD (NL)",
          "addressLine1": "Centre Malley Lumieres Chemin du Viaduc 1",
          "addressLine2": null,
          "city": "Prilly",
          "postalCode": "1008",
          "country": "Switzerland",
          "phone": "+41 -+41 21 566 54 40-",
          "contactEmail": "Kaushik.shah@nexthink.com",
          "orderingAddress": "Centre Malley Lumieres Chemin du Viaduc 1 Prilly, 1008 Switzerland"
        },
        "shipTo": {
          "name": "NLAMAMSA04 : Amsterdam - AM NLD, KBF",
          "addressLine1": "Cognizant Technology Solutions Benelux B.V.",
          "addressLine2": "(MA303), Paul van Vlissingenstraat 10C",
          "city": "Amsterdam",
          "postalCode": "1096 BK",
          "country": "Netherlands"
        },
        "billTo": {
          "name": "NLAMAMSA04 : Amsterdam - AM NLD, KBF",
          "company": null,
          "addressLine1": "Cognizant Technology Solutions Benelux B.V.",
          "addressLine2": "(MA303), Paul van Vlissingenstraat 10C",
          "city": "Amsterdam",
          "state": "AM",
          "postalCode": "1096 BK",
          "country": "Netherlands"
        },
        "deliverTo": {
          "email": "Suresh.Balasubramanian@cognizant.com",
          "glBusinessUnit": "Cognizant Benelux B.V.",
          "assetProfile": null,
          "assetLocation": null,
          "asset": null,
          "locationCode": {
            "id": "NLAMAMSA04",
            "name": "NLAMAMSA04 : Amsterdam - AM NLD, KBF",
            "description": "Amsterdam - AM NLD, KBF",
            "address": "Cognizant Technology Solutions Benelux B.V.(MA303), Paul van Vlissingenstraat 10C,",
            "city": "Netherlands",
            "state": "AM",
            "postalCode": "1096 BK",
            "status": "Standard",
            "region": "Europe"
          }
        },
        "lineItems": [
          {
            "id": 1,
            "lineNo": 1,
            "description": "MSP Workplace Experience - Nexthink Infinity Subscription Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT Description: Cognizant Benelux B.V. ID: NLAMAMSA04 Name: NLAMAMSA04 : Amsterdam - AM NLD, KBF Description: Amsterdam - AM NLD, KBF Address: Cognizant Technology Solutions Benelux B.V.(MA303), Paul van Vlissingenstraat 10C, Amsterdam City: Netherlands State: AM Postal: 1096 BK Location Status: Standard Region: Europe",
            "fullDescription": "MSP Workplace Experience - Nexthink Infinity Subscription Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT Description: Cognizant Benelux B.V. ID: NLAMAMSA04 Name: NLAMAMSA04 : Amsterdam - AM NLD, KBF Description: Amsterdam - AM NLD, KBF Address: Cognizant Technology Solutions Benelux B.V.(MA303), Paul van Vlissingenstraat 10C, Amsterdam City: Netherlands State: AM Postal: 1096 BK Location Status: Standard Region: Europe",
            "partNumber": "SP-DIPC CS",
            "quantity": 1,
            "uom": "each",
            "needByDate": null,
            "unitPrice": 180000,
            "discount": 0,
            "netAmount": 180000,
            "charges": 0,
            "taxes": 0,
            "amount": 180000,
            "currency": "USD"
          },
          {
            "id": 2,
            "lineNo": 2,
            "description": "MSP Collaboration Experience - Nexthink Infinity Subscription- Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT",
            "fullDescription": "MSP Collaboration Experience - Nexthink Infinity Subscription- Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT",
            "partNumber": "SP-DICE CS",
            "quantity": 1,
            "uom": "each",
            "needByDate": null,
            "unitPrice": 18000,
            "discount": 0,
            "netAmount": 18000,
            "charges": 0,
            "taxes": 0,
            "amount": 18000,
            "currency": "USD"
          },
          {
            "id": 3,
            "lineNo": 3,
            "description": "Nexthink MSP Accelerate - Pro- Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT",
            "fullDescription": "Nexthink MSP Accelerate - Pro- Qty 6000 for 3 Years NUMBER QTY NEED- BY DATE UNIT PRICE DISCOUNT NET AMOUNT CHARGES TAXES AMOUNT",
            "partNumber": "MSP ACCELERATE PRO-CS",
            "quantity": 1,
            "uom": "each",
            "needByDate": null,
            "unitPrice": 21840,
            "discount": 0,
            "netAmount": 21840,
            "charges": 0,
            "taxes": 0,
            "amount": 21840,
            "currency": "USD"
          },
          {
            "id": 4,
            "lineNo": 4,
            "description": "MSP Foundation - Infinity Basic - Off-Shore Rate - Billed in Advance",
            "fullDescription": "MSP Foundation - Infinity Basic - Off-Shore Rate - Billed in Advance",
            "partNumber": "SVC-MSP- FIB OFFSHORE- PCK",
            "quantity": 1,
            "uom": "each",
            "needByDate": null,
            "unitPrice": 10000,
            "discount": 0,
            "netAmount": 10000,
            "charges": 0,
            "taxes": 0,
            "amount": 10000,
            "currency": "USD"
          }
        ],
        "summary": null,
        "documents": [
          {
            "id": 1,
            "fileName": "Sample PO.pdf",
            "contentType": "application/pdf",
            "fileSizeBytes": 256592,
            "storageBackend": "LOCAL",
            "storageKey": "PO515366/Sample PO.pdf",
            "storageBucket": null,
            "downloadUrl": "/api/v1/purchase-orders/1/documents/1/download"
          }
        ]
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 100,
      "sort": {
        "empty": false,
        "unsorted": false,
        "sorted": true
      },
      "offset": 0,
      "unpaged": false,
      "paged": true
    },
    "last": true,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "size": 100,
    "number": 0,
    "sort": {
      "empty": false,
      "unsorted": false,
      "sorted": true
    },
    "numberOfElements": 1,
    "empty": false
  },
  "message": null,
  "timestamp": "2026-09-23T06:14:47.586832300Z"
}