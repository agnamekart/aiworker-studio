import ParsedValue from "./ParsedValue";
import { shortenId } from "../utils/studioUtils";

export default function StateTimelinePanel({
  executionSnapshots,
  onOpenRawSnapshot,
  onSelectState,
  selectedExecution,
  selectedExecutionUniqueNodeCount,
  selectedSectionValue,
  selectedState,
  selectedStatePosition,
  selectedStateSectionKey,
  setSelectedStateSectionKey,
  stateOverview,
  stateSections
}) {
  return (
    <section className="panel flex h-[calc(100vh-220px)] min-h-[520px] flex-col bg-gradient-to-b from-slate-50/95 to-white/90">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">State Timeline</h2>
      </div>

      <div className="sticky top-0 z-10 mb-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2 sm:grid-cols-[max-content_max-content_max-content_1fr] sm:items-center">
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">States: {executionSnapshots.length}</span>
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">Nodes: {selectedExecutionUniqueNodeCount}</span>
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">
          Position: {selectedStatePosition || 0}/{executionSnapshots.length || 0}
        </span>
        <div className="h-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
            style={{
              width:
                executionSnapshots.length > 0
                  ? `${Math.round((selectedStatePosition / executionSnapshots.length) * 100)}%`
                  : "0%"
            }}
          />
        </div>
      </div>

      <div className="min-h-0 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2">
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2">
            <strong className="text-xs text-slate-700">Execution States</strong>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">{executionSnapshots.length} total</span>
          </div>

          {executionSnapshots.map((snapshot, index) => {
            const active = selectedState?.key === snapshot.key;
            return (
              <button
                key={snapshot.key}
                className={[
                  "relative mb-2 w-full rounded-xl border p-2 text-left shadow-sm transition hover:translate-x-0.5",
                  active
                    ? "border-sky-300 bg-gradient-to-r from-sky-50 to-emerald-50"
                    : "border-slate-200 bg-white hover:border-sky-200"
                ].join(" ")}
                onClick={() => onSelectState(snapshot.index)}
              >
                {active && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-500" />}
                <span className="block text-xs font-bold text-slate-800">{snapshot.node}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-600">Step {index + 1}</span>
                  <span
                    className={`badge ${
                      snapshot.isResumePhase
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {snapshot.isResumePhase ? `RESUME P${snapshot.phase}` : `BASE P${snapshot.phase}`}
                  </span>
                  <span className="badge border-slate-200 bg-slate-50 text-sky-700">
                    {shortenId(snapshot.checkpoint || "no-checkpoint", 6)}
                  </span>
                </span>
                <span className="mt-1 block break-all text-[10px] text-slate-500">
                  {snapshot.checkpoint || "no-checkpoint"}
                </span>
              </button>
            );
          })}

          {!selectedExecution && <p className="p-2 text-sm text-slate-500">Select a thread to inspect state</p>}
        </aside>

        <article className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="text-xl font-semibold text-slate-800">{selectedState?.node || "State Payload"}</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
              Checkpoint: {selectedState?.checkpoint || "none"}
            </span>
          </div>

          {selectedState ? (
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2">
                <label className="min-w-[110px] text-xs font-semibold uppercase tracking-wide text-slate-600">State Section</label>
                <select
                  className="max-w-[320px]"
                  value={selectedStateSectionKey}
                  onChange={(event) => setSelectedStateSectionKey(event.target.value)}
                >
                  {stateSections.map((section) => (
                    <option key={section.key} value={section.key}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStateSectionKey === "__overview" ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {stateOverview.map((entry) => (
                    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3" key={entry.key}>
                      <div className="text-xs font-bold text-slate-800">{entry.key}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{entry.type}</div>
                      <div className="mt-2 text-xs text-slate-600">{entry.summary}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <ParsedValue value={selectedSectionValue} />
              )}

              <div className="mt-3">
                <button
                  type="button"
                  className="btn-ghost border-sky-200 bg-sky-50 text-sky-700"
                  onClick={onOpenRawSnapshot}
                >
                  View Raw Snapshot JSON
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No state selected</p>
          )}
        </article>
      </div>
    </section>
  );
}
