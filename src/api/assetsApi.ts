export interface Asset {
  id: string;
  name: string;
  status: string;
  locationId: string | null;
  ownerId: string;
  assignedTechnicianId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  name: string;
  status: string;
  locationId?: string;
  ownerId: string;
  assignedTechnicianId?: string;
}

// Requests go through asset-gateway (Path=/api/** route, Section 8.4),
// never directly to asset-api.
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/assets`;

async function authorizedFetch(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init.method ?? "GET"} ${url} failed: ${res.status} ${body}`);
  }
  return res;
}

export async function listAssets(accessToken: string): Promise<Asset[]> {
  const res = await authorizedFetch(BASE_URL, accessToken);
  return res.json();
}

export async function createAsset(accessToken: string, request: CreateAssetRequest): Promise<Asset> {
  const res = await authorizedFetch(BASE_URL, accessToken, {
    method: "POST",
    body: JSON.stringify(request),
  });
  return res.json();
}

export async function updateAssetStatus(accessToken: string, id: string, status: string): Promise<Asset> {
  const res = await authorizedFetch(`${BASE_URL}/${id}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return res.json();
}
