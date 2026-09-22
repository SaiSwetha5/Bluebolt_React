import { useEffect, useState, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { listAssets, updateAssetStatus, type Asset } from "../../api/assetsApi";
import { RequireRole } from "../../routes/RequireRole";
import { ROLES } from "../../auth/role";

export function AssetList() {
  const auth = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.user?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      setAssets(await listAssets(auth.user.access_token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, [auth.user?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  async function markComplete(assetId: string) {
    if (!auth.user?.access_token) return;
    try {
      await updateAssetStatus(auth.user.access_token, assetId, "complete");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update asset");
    }
  }

  if (loading) return <p>Loading assets…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Location</th>
          <th>Assigned technician</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.name}</td>
            <td>{asset.status}</td>
            <td>{asset.locationId ?? "—"}</td>
            <td>{asset.assignedTechnicianId ?? "—"}</td>
            <td>
              {/* Field Technician's only permitted write, per Section 8.3 */}
              <RequireRole allow={[ROLES.FIELD_TECHNICIAN, ROLES.ASSET_MANAGER]}>
                <button onClick={() => markComplete(asset.id)} disabled={asset.status === "complete"}>
                  Mark complete
                </button>
              </RequireRole>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
