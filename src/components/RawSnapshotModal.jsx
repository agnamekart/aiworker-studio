import { safeJson, shortenId } from "../utils/studioUtils";

export default function RawSnapshotModal({ onClose, onCopy, rawSnapshotOverlayOpen, selectedState }) {
  if (!rawSnapshotOverlayOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="panel my-auto w-full max-w-[1100px] border-slate-200 bg-white shadow-strong"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-5 pb-4 pt-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Raw Snapshot JSON</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                Node: {selectedState?.node ?? "unknown"}
              </span>
              <span className="badge border-slate-200 bg-slate-50 font-mono text-slate-500">
                {shortenId(selectedState?.checkpoint || "none", 10)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100" onClick={onCopy}>
              ⎘ Copy JSON
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Code block */}
        <div className="rounded-xl border border-slate-200 bg-slate-950 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            </span>
            <span className="text-[10px] font-semibold text-slate-500">JSON · Read only</span>
          </div>
          <pre className="scrollbar-dark max-h-[calc(100vh-280px)] overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
            {selectedState ? safeJson(selectedState.raw) : "No snapshot selected."}
          </pre>
        </div>
      </section>
    </div>
  );
}
