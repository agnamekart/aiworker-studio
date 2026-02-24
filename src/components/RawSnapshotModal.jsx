import { safeJson, shortenId } from "../utils/studioUtils";

export default function RawSnapshotModal({
  onClose,
  onCopy,
  rawSnapshotOverlayOpen,
  selectedState
}) {
  if (!rawSnapshotOverlayOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <section
        className="panel mx-auto max-h-[calc(100vh-24px)] w-full max-w-[1100px] overflow-auto bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Raw Snapshot JSON</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge border-slate-200 bg-slate-50 text-slate-700">
                Node: {selectedState?.node ?? "unknown"}
              </span>
              <span className="badge border-slate-200 bg-slate-50 text-slate-700">
                Checkpoint: {shortenId(selectedState?.checkpoint || "none", 8)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={onCopy}>
              Copy JSON
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="max-h-[calc(100vh-220px)] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-100">
          {selectedState ? safeJson(selectedState.raw) : "No snapshot selected."}
        </pre>
      </section>
    </div>
  );
}
