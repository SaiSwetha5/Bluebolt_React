import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './store/DataContext';
import Shell from './components/layout/Shell';
import Dashboard from './pages/dashboard/Dashboard';
import PoList from './pages/po/PoList';
import PoImport from './pages/po/PoImport';
import PoDetail from './pages/po/PoDetail';
import PrList from './pages/procurement/PrList';
import PrCreate from './pages/procurement/PrCreate';
import PrDetail from './pages/procurement/PrDetail';
import VendorOrderList from './pages/procurement/VendorOrderList';
import VendorOrderCreate from './pages/procurement/VendorOrderCreate';
import ShipmentTracking from './pages/procurement/ShipmentTracking';
import GoodsReceipt from './pages/warehouse/GoodsReceipt';
import DeviceAllocation from './pages/warehouse/DeviceAllocation';
import GrnList from './pages/finance/GrnList';
import InvoiceManagement from './pages/finance/InvoiceManagement';
import ApProcessing from './pages/finance/ApProcessing';
import AssetList from './pages/inventory/AssetList';
import AssetDetail from './pages/inventory/AssetDetail';
import CatalogList from './pages/catalog/CatalogList';
import CatalogDetail from './pages/catalog/CatalogDetail';
import AuditLog from './pages/audit/AuditLog';
import CustomerHierarchy from './pages/inventory/CustomerHierarchy';
import CustomerEntityScreen from './pages/inventory/CustomerEntityScreen';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* PO — import MUST be before :id */}
            <Route path="po" element={<PoList />} />
            <Route path="po/import" element={<PoImport />} />
            <Route path="po/:id" element={<PoDetail />} />

            {/* Procurement */}
            <Route path="procurement/requisitions" element={<PrList />} />
            <Route path="procurement/requisitions/new" element={<PrCreate />} />
            <Route path="procurement/requisitions/:id" element={<PrDetail />} />
            <Route path="procurement/orders" element={<VendorOrderList />} />
            <Route path="procurement/orders/new" element={<VendorOrderCreate />} />
            <Route path="procurement/tracking" element={<ShipmentTracking />} />

            {/* Warehouse */}
            <Route path="warehouse/receipt" element={<GoodsReceipt />} />
            <Route path="warehouse/allocation" element={<DeviceAllocation />} />

            {/* Finance */}
            <Route path="finance/grn" element={<GrnList />} />
            <Route path="finance/invoices" element={<InvoiceManagement />} />
            <Route path="finance/ap" element={<ApProcessing />} />

            {/* Inventory */}
            <Route path="inventory" element={<AssetList />} />
            <Route path="inventory/:id" element={<AssetDetail />} />

            {/* Catalog */}
            <Route path="catalog" element={<CatalogList />} />
            <Route path="catalog/:id" element={<CatalogDetail />} />
            <Route

path="customer-entity"

element={<CustomerHierarchy />}

/> 
            <Route

path="customer"

element={<CustomerEntityScreen />}

/> 

            {/* Audit */}
            <Route path="audit" element={<AuditLog />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
