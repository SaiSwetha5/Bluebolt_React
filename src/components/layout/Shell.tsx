import { NavLink, Outlet } from 'react-router-dom';
import ProcurementInbox from '../ui/ProcurementInbox';

interface NavItem { label: string; icon: string; link: string; }
interface NavGroup { title: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', icon: '▦', link: '/dashboard' }] },
  { title: 'Asset Requests', items: [
    { label: 'Customer POs', icon: '📄', link: '/po' },
    { label: 'PO Import', icon: '⬇', link: '/po/import' },
    { label: 'Purchase Requisitions', icon: '📋', link: '/procurement/requisitions' },
    { label: 'Procurement', icon: '➕', link: '/procurement/orders/new' },
    { label: 'Vendor Requests', icon: '🛒', link: '/procurement/orders' },
  ]},
  { title: 'Warehouse', items: [
    { label: 'Shipment Tracking', icon: '🚚', link: '/procurement/tracking' },
    { label: 'Goods Receipt / POD', icon: '📦', link: '/warehouse/receipt' },
    { label: 'Device Allocation', icon: '📋', link: '/warehouse/allocation' },
  ]},
  { title: 'Finance', items: [
    { label: 'GRNs', icon: '🧾', link: '/finance/grn' },
    { label: 'Invoices & Lease', icon: '💰', link: '/finance/invoices' },
    { label: 'Accounts Payable', icon: '🏦', link: '/finance/ap' },
  ]},
  { title: 'Asset Management', items: [
    { label: 'Inventory / CMDB', icon: '🖥', link: '/inventory' },
    { label: 'Catalog Management', icon: '📘', link: '/catalog' },
  ]},
  { title: 'Governance', items: [
    { label: 'Audit Log', icon: '🔎', link: '/audit' },
  ]},
];

export default function Shell() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="no-print w-64 shrink-0 bg-slate-925 text-slate-200 flex flex-col" style={{ backgroundColor: '#0f172a' }}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white text-sm">A3</div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Asset360</p>
            <p className="text-[11px] text-slate-400 leading-tight">PO-to-Lease Fulfillment</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map(group => (
            <div key={group.title}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{group.title}</p>
              {group.items.map(item => (
                <NavLink key={item.link} to={item.link}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                  }>
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-[11px] text-slate-500">
          Cognizant-owned platform · Demo build
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div>
            <p className="text-sm text-slate-400">Cognizant · Asset360</p>
            <h1 className="text-base font-semibold text-slate-800">Client Device Lifecycle Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <ProcurementInbox />
            <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">AS</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
