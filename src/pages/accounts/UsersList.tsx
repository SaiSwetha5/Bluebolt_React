import { useState } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { SsoProvider, SystemRole } from '../../types/models';
import { SYSTEM_ROLES } from '../../types/models';

// Account Management — module 9: Users, RBAC, Vendors, Customers, SSO, Audit.
export default function UsersList() {
  const { users, createUser, updateUserRole, toggleUserStatus } = useData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SystemRole>('Viewer');
  const [ssoProvider, setSsoProvider] = useState<SsoProvider>('Azure AD');

  function submit() {
    if (!name || !email) return;
    createUser({ name, email, role, ssoProvider });
    setName(''); setEmail(''); setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">Platform users, their role assignment and SSO identity provider.</p>
        </div>
        <button className="a360-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ Add User'}</button>
      </div>

      {showForm && (
        <div className="a360-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="a360-label">Full Name</label><input className="a360-input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="a360-label">Email</label><input className="a360-input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Role</label>
              <select className="a360-input" value={role} onChange={e => setRole(e.target.value as SystemRole)}>
                {SYSTEM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="a360-label">SSO Provider</label>
              <select className="a360-input" value={ssoProvider} onChange={e => setSsoProvider(e.target.value as SsoProvider)}>
                <option>Azure AD</option><option>Okta</option><option>Google Workspace</option><option>None</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end"><button className="a360-btn-primary" onClick={submit}>Create User</button></div>
        </div>
      )}

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">User</th><th className="a360-th">Email</th><th className="a360-th">Role</th>
            <th className="a360-th">SSO</th><th className="a360-th">Status</th><th className="a360-th">Last Login</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{u.name}</td>
                <td className="a360-td text-slate-500">{u.email}</td>
                <td className="a360-td">
                  <select className="a360-input !py-1 !text-xs" value={u.role} onChange={e => updateUserRole(u.id, e.target.value as SystemRole)}>
                    {SYSTEM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="a360-td text-slate-500">{u.ssoProvider}</td>
                <td className="a360-td"><StatusBadge status={u.status} /></td>
                <td className="a360-td text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                <td className="a360-td text-right">
                  <button className="a360-btn-secondary !py-1 !px-2 text-xs" onClick={() => toggleUserStatus(u.id)}>{u.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan={7} className="a360-td text-center text-slate-400 py-8">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
