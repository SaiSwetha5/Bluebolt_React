import { Link } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import StatusBadge from '../../components/ui/StatusBadge';

// DaaS Receivables — module 8: customer subscriptions / device rentals.
// Workflow: Customer Uses Device → Generate Invoice → Receive Payment.
export default function SubscriptionList() {
  const { customerSubscriptions } = useData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Customer Subscriptions</h1>
          <p className="text-sm text-slate-500">DaaS device rental agreements billed monthly against the operating lease schedule.</p>
        </div>
        <Link to="/receivables/subscriptions/new" className="a360-btn-primary">+ New Subscription</Link>
      </div>

      <div className="a360-card overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className="a360-th">Subscription</th><th className="a360-th">Customer</th><th className="a360-th">Asset</th>
            <th className="a360-th">Service Class</th><th className="a360-th">Monthly Payment</th>
            <th className="a360-th">Term</th><th className="a360-th">Progress</th><th className="a360-th">Status</th><th className="a360-th"></th>
          </tr></thead>
          <tbody>
            {customerSubscriptions.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="a360-td font-medium text-brand-700">{s.id}</td>
                <td className="a360-td">{s.customerName}</td>
                <td className="a360-td text-slate-500">{s.assetId}</td>
                <td className="a360-td">{s.serviceClass}</td>
                <td className="a360-td">${s.monthlyPayment.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                <td className="a360-td">{s.termMonths} mo</td>
                <td className="a360-td text-slate-500">{Math.min(s.nextInvoicePeriod - 1, s.termMonths)}/{s.termMonths} billed</td>
                <td className="a360-td"><StatusBadge status={s.status} /></td>
                <td className="a360-td text-right"><Link to={`/receivables/subscriptions/${s.id}`} className="a360-btn-secondary !py-1 !px-2 text-xs">View</Link></td>
              </tr>
            ))}
            {!customerSubscriptions.length && <tr><td colSpan={9} className="a360-td text-center text-slate-400 py-8">No active subscriptions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
