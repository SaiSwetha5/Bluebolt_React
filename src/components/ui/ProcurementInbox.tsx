import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../store/DataContext';
import type { PrNotification } from '../../types/models';

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}

export default function ProcurementInbox() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PrNotification | null>(null);

  const unread = notifications.filter(n => !n.read).length;

  function openNotif(n: PrNotification) {
    markNotificationRead(n.id);
    setSelected(n);
  }

  const iconCls = (type: PrNotification['type']) =>
    type === 'APPROVAL_REQUESTED' ? 'bg-amber-100 text-amber-700'
    : type === 'PR_APPROVED' ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Procurement Mailbox</p>
              <p className="text-xs text-slate-400">{notifications.length} notification(s) · {unread} unread</p>
            </div>
            {unread > 0 && <button onClick={markAllNotificationsRead} className="text-xs text-brand-600 hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 cursor-pointer ${!n.read ? 'bg-brand-50' : ''}`} onClick={() => openNotif(n)}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${iconCls(n.type)}`}>
                    {n.type === 'APPROVAL_REQUESTED' ? '?' : n.type === 'PR_APPROVED' ? '✓' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{n.subject}</p>
                      {!n.read && <span className="flex-shrink-0 h-2 w-2 rounded-full bg-brand-500" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(n.timestamp)} · To: {n.to}</p>
                  </div>
                </div>
              </div>
            ))}
            {!notifications.length && <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</div>}
          </div>
          {selected && (
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700 truncate">{selected.subject}</p>
                <button className="text-slate-400 hover:text-slate-600 ml-2" onClick={() => setSelected(null)}>×</button>
              </div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{selected.body}</pre>
              <button className="mt-3 inline-block a360-btn-primary text-xs px-3 py-1.5" onClick={() => { navigate(`/procurement/requisitions/${selected.prId}`); setOpen(false); setSelected(null); }}>
                Open {selected.prId}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
