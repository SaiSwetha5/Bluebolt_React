import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function CustomerAccounts() {
  const { customerAccounts, createCustomerAccount } = useData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('APAC');
  const [billingContact, setBillingContact] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [creditTermDays, setCreditTermDays] = useState(30);

  function submit() {
    if (!name || !billingContact || !billingEmail) return;
    createCustomerAccount({ name, region, billingContact, billingEmail, creditTermDays });
    setName(''); setBillingContact(''); setBillingEmail(''); setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Customer Accounts</h1>
          <p className="text-sm text-slate-500">Client billing accounts used by DaaS Receivables. For entity/office hierarchy, see <Link to="/customer-entity" className="text-brand-600 hover:underline">Customer Entity</Link>.</p>
        </div>
        <button className="a360-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ Add Customer Account'}</button>
      </div>

      {showForm && (
        <div className="a360-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="a360-label">Customer Name</label><input className="a360-input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="a360-label">Region</label><input className="a360-input" value={region} onChange={e => setRegion(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="a360-label">Billing Contact</label><input className="a360-input" value={billingContact} onChange={e => setBillingContact(e.target.value)} /></div>
            <div><label className="a360-label">Billing Email</label><input className="a360-input" type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} /></div>
          </div>
          <div className="w-1/3"><label className="a360-label">Credit Terms (days)</label><input className="a360-input" type="number" value={creditTermDays} onChange={e => setCreditTermDays(Number(e.target.value))} /></div>
          <div className="flex justify-end"><button className="a360-btn-primary" onClick={submit}>Create Customer Account</button></div>
        </div>
      )}

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Customer</th><th className="a360-th">Region</th><th className="a360-th">Billing Contact</th>
            <th className="a360-th">Email</th><th className="a360-th">Credit Terms</th><th className="a360-th">Status</th>
          </tr></thead>
          <tbody>
            {customerAccounts.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{c.name}</td>
                <td className="a360-td">{c.region}</td>
                <td className="a360-td">{c.billingContact}</td>
                <td className="a360-td text-slate-500">{c.billingEmail}</td>
                <td className="a360-td">Net {c.creditTermDays}</td>
                <td className="a360-td"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {!customerAccounts.length && <tr><td colSpan={6} className="a360-td text-center text-slate-400 py-8">No customer accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
