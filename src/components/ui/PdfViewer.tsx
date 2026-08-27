export default function PdfViewer({ dataUrl, fileName }: { dataUrl: string; fileName?: string }) {
  if (!dataUrl) return null;
  return (
    <div className="a360-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-5 h-5 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 0 1-1-1V3.5z"/></svg>
          <span className="text-sm font-medium text-slate-700 truncate">{fileName || 'Document.pdf'}</span>
        </div>
        <a href={dataUrl} download={fileName || 'document.pdf'} className="a360-btn-secondary !py-1 !px-2 text-xs">Download</a>
      </div>
      <div className="bg-slate-100">
        <iframe src={dataUrl} className="w-full" style={{ height: 480 }} title="PDF preview" />
      </div>
    </div>
  );
}
