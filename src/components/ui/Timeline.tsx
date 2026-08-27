export interface TimelineStep {
  label: string; timestamp?: string; sublabel?: string;
  state: 'done' | 'current' | 'pending' | 'error';
}

function fmt(ts?: string) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-start w-full overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const dotCls = step.state === 'done' ? 'bg-emerald-500 border-emerald-500 text-white'
          : step.state === 'current' ? 'bg-brand-600 border-brand-600 text-white animate-pulse'
          : step.state === 'error' ? 'bg-rose-500 border-rose-500 text-white'
          : 'bg-white border-slate-300 text-slate-400';
        return (
          <div key={i} className={`flex items-start${!last ? ' flex-1' : ''}`}>
            <div className="flex flex-col items-center min-w-[110px]">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${dotCls}`}>
                {step.state === 'done'
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : '●'}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700 text-center leading-tight">{step.label}</p>
              {step.sublabel && <p className="text-[11px] text-slate-400 text-center">{step.sublabel}</p>}
              {step.timestamp && <p className="text-[11px] text-slate-400 text-center">{fmt(step.timestamp)}</p>}
            </div>
            {!last && <div className={`h-0.5 mt-4 flex-1 min-w-[24px] ${step.state === 'done' ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}
