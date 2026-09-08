import type { RoleDefinition } from '../../types/models';

const MODULES = [
  'Catalog Management', 'Demand Management', 'Procurement', 'Order Management',
  'Request Fulfillment', 'Asset Management', 'DaaS Payable', 'DaaS Receivables', 'Account Management',
];

// Static RBAC matrix — module x permission, per system role. This is the
// authorization model referenced by Users; it's presented read-only here
// since role *definitions* change rarely relative to role *assignment*.
const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: 'Admin', description: 'Full access across every module, including account and role administration.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: true, approve: true })) },
  { role: 'Procurement Manager', description: 'Manages catalog, demand, procurement and vendor orders end to end.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: ['Catalog Management','Demand Management','Procurement','Order Management'].includes(m), approve: ['Demand Management','Procurement'].includes(m) })) },
  { role: 'Finance Approver', description: 'Owns payables/receivables invoice matching, lease schedules and payment approval.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: ['DaaS Payable','DaaS Receivables'].includes(m), approve: ['DaaS Payable','DaaS Receivables'].includes(m) })) },
  { role: 'Warehouse Ops', description: 'Handles goods receipt, device allocation and asset lifecycle in the warehouse.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: ['Order Management','Request Fulfillment','Asset Management'].includes(m), approve: false })) },
  { role: 'Customer Success', description: 'Manages customer subscriptions, billing communication and account records.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: ['DaaS Receivables','Account Management'].includes(m), approve: false })) },
  { role: 'Viewer', description: 'Read-only access across all modules for reporting and audit purposes.',
    permissions: MODULES.map(m => ({ module: m, view: true, edit: false, approve: false })) },
];

function Cell({ v }: { v: boolean }) {
  return v ? <span className="text-emerald-600 font-semibold">✓</span> : <span className="text-slate-300">–</span>;
}

export default function RolesMatrix() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Roles &amp; Permissions</h1>
        <p className="text-sm text-slate-500">RBAC matrix — view / edit / approve rights per module, by system role.</p>
      </div>

      {ROLE_DEFINITIONS.map(rd => (
        <div key={rd.role} className="a360-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">{rd.role}</h2>
            <p className="text-xs text-slate-500">{rd.description}</p>
          </div>
          <table className="w-full">
            <thead><tr>
              <th className="a360-th">Module</th><th className="a360-th">View</th><th className="a360-th">Edit</th><th className="a360-th">Approve</th>
            </tr></thead>
            <tbody>
              {rd.permissions.map(p => (
                <tr key={p.module} className="hover:bg-slate-50">
                  <td className="a360-td">{p.module}</td>
                  <td className="a360-td"><Cell v={p.view} /></td>
                  <td className="a360-td"><Cell v={p.edit} /></td>
                  <td className="a360-td"><Cell v={p.approve} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
