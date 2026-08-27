const STYLES: Record<string, string> = {
  RECEIVED:'bg-slate-100 text-slate-700', ACKNOWLEDGED:'bg-sky-100 text-sky-700',
  PENDING_APPROVAL:'bg-amber-100 text-amber-800', APPROVED:'bg-emerald-100 text-emerald-700',
  REJECTED:'bg-rose-100 text-rose-700', CONVERTED:'bg-indigo-100 text-indigo-700',
  DRAFT:'bg-slate-100 text-slate-700', SUBMITTED:'bg-sky-100 text-sky-700',
  CONFIRMED:'bg-indigo-100 text-indigo-700', IN_PRODUCTION:'bg-indigo-100 text-indigo-700',
  SHIPPED:'bg-violet-100 text-violet-700', DELIVERED:'bg-emerald-100 text-emerald-700',
  CANCELLED:'bg-rose-100 text-rose-700', PENDING:'bg-slate-100 text-slate-700',
  LABEL_CREATED:'bg-slate-100 text-slate-700', IN_TRANSIT:'bg-violet-100 text-violet-700',
  OUT_FOR_DELIVERY:'bg-violet-100 text-violet-700', EXCEPTION:'bg-rose-100 text-rose-700',
  MATCHED:'bg-emerald-100 text-emerald-700', APPROVED_FOR_PAYMENT:'bg-indigo-100 text-indigo-700',
  PAID:'bg-emerald-100 text-emerald-700', ACTIVE:'bg-emerald-100 text-emerald-700',
  CLOSED:'bg-slate-100 text-slate-700', IN_PROCUREMENT:'bg-sky-100 text-sky-700',
  IN_STOCK:'bg-indigo-100 text-indigo-700', DEPLOYED:'bg-emerald-100 text-emerald-700',
  IN_REPAIR:'bg-amber-100 text-amber-800', RETIRED:'bg-slate-200 text-slate-600',
  Good:'bg-emerald-100 text-emerald-700', Damaged:'bg-rose-100 text-rose-700', Partial:'bg-amber-100 text-amber-800'
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}
