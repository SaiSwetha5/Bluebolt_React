import { useState } from 'react';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';
import type { VendorName } from '../../types/models';

export default function VendorAccounts() {
  const { vendorAccounts, createVendorAccount } = useData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState<VendorName>('HP');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  function submit() {
    if (!contactName || !contactEmail || !contractRef) return;
    createVendorAccount({ name, contactName, contactEmail, contractRef, paymentTerms });
    setContactName(''); setContactEmail(''); setContractRef(''); setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Vendor Accounts</h1>
          <p className="text-sm text-slate-500">OEM/vendor master data — contacts, master service agreements and payment terms.</p>
        </div>
        <button className="a360-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ Add Vendor Account'}</button>
      </div>

      {showForm && (
        <div className="a360-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="a360-label">Vendor</label>
              <select className="a360-input" value={name} onChange={e => setName(e.target.value as VendorName)}>
                <option>HP</option><option>Dell</option><option>Lenovo</option>
              </select>
            </div>
            <div><label className="a360-label">Payment Terms</label><input className="a360-input" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="a360-label">Contact Name</label><input className="a360-input" value={contactName} onChange={e => setContactName(e.target.value)} /></div>
            <div><label className="a360-label">Contact Email</label><input className="a360-input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
          </div>
          <div><label className="a360-label">Contract Reference</label><input className="a360-input" value={contractRef} onChange={e => setContractRef(e.target.value)} /></div>
          <div className="flex justify-end"><button className="a360-btn-primary" onClick={submit}>Create Vendor Account</button></div>
        </div>
      )}

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Vendor</th><th className="a360-th">Contact</th><th className="a360-th">Email</th>
            <th className="a360-th">Contract Ref</th><th className="a360-th">Payment Terms</th><th className="a360-th">Status</th>
          </tr></thead>
          <tbody>
            {vendorAccounts.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{v.name}</td>
                <td className="a360-td">{v.contactName}</td>
                <td className="a360-td text-slate-500">{v.contactEmail}</td>
                <td className="a360-td">{v.contractRef}</td>
                <td className="a360-td">{v.paymentTerms}</td>
                <td className="a360-td"><StatusBadge status={v.status} /></td>
              </tr>
            ))}
            {!vendorAccounts.length && <tr><td colSpan={6} className="a360-td text-center text-slate-400 py-8">No vendor accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
