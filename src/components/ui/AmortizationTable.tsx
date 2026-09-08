import type { LeaseAmortizationRow } from '../../utils/leaseCalculator';
import { fmtDMY } from '../../utils/leaseCalculator';

function money(n: number) {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AmortizationTable({ rows, maxRows }: { rows: LeaseAmortizationRow[]; maxRows?: number }) {
  const shown = maxRows ? rows.slice(0, maxRows) : rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="a360-th">Pmt no.</th>
            <th className="a360-th">Payment date</th>
            <th className="a360-th">Beginning balance</th>
            <th className="a360-th">Payment</th>
            <th className="a360-th">Principal</th>
            <th className="a360-th">Interest</th>
            <th className="a360-th">Ending balance</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(row => (
            <tr key={row.period} className="hover:bg-slate-50">
              <td className="a360-td text-slate-500">{row.period}</td>
              <td className="a360-td">{fmtDMY(row.paymentDate)}</td>
              <td className="a360-td">{money(row.beginningBalance)}</td>
              <td className="a360-td font-medium text-brand-700">{money(row.payment)}</td>
              <td className="a360-td">{money(row.principal)}</td>
              <td className="a360-td">{money(row.interest)}</td>
              <td className="a360-td">{money(row.endingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && rows.length > maxRows && (
        <p className="px-4 py-2 text-xs text-slate-400">Showing first {maxRows} of {rows.length} payments.</p>
      )}
    </div>
  );
}
