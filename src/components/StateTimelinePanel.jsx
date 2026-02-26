import ParsedValue from "./ParsedValue";
import { shortenId } from "../utils/studioUtils";

export default function StateTimelinePanel({
  timelineEntries = [],
  onOpenRawSnapshot,
  onSelectState,
  graphExecutions = [],
  selectedGraphExecutionId,
  onSelectGraphExecution,
  selectedExecution,
  selectedExecutionUniqueNodeCount,
  selectedSectionValue,
  selectedState,
  selectedStateIndex,
  selectedStatePosition,
  selectedStateSectionKey,
  setSelectedStateSectionKey,
  stateOverview,
  stateSections
}) {
  const statusBadgeClass = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "FAILED") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    if (normalized === "COMPLETED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (normalized === "STARTED" || normalized === "RUNNING") {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }
    if (normalized === "SKIPPED" || normalized === "PAUSED") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  return (
    <section className="panel flex h-[calc(100vh-220px)] min-h-[520px] flex-col bg-gradient-to-b from-slate-50/95 to-white/90">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">State Timeline</h2>
        {graphExecutions.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Execution
            <select
              className="min-w-[180px]"
              value={selectedGraphExecutionId}
              onChange={(event) => onSelectGraphExecution?.(event.target.value)}
            >
              {graphExecutions.map((execution, index) => (
                <option key={execution.id ?? `${execution.startedAtMs}_${execution.mode}`} value={String(execution.id)}>
                  {`Execution ${graphExecutions.length - index} | ${execution.status ?? "UNKNOWN"}`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="sticky top-0 z-10 mb-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2 sm:grid-cols-[max-content_max-content_max-content_1fr] sm:items-center">
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">States: {timelineEntries.length}</span>
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">Nodes: {selectedExecutionUniqueNodeCount}</span>
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">
          Position: {selectedStatePosition || 0}/{timelineEntries.length || 0}
        </span>
        <div className="h-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
            style={{
              width: timelineEntries.length > 0 ? `${Math.round((selectedStatePosition / timelineEntries.length) * 100)}%` : "0%"
            }}
          />
        </div>
      </div>

      <div className="min-h-0 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2">
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 p-2">
            <strong className="text-xs text-slate-700">Execution States</strong>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">{timelineEntries.length} total</span>
          </div>

          {timelineEntries.map((entry, index) => {
            const active =
              typeof entry.snapshotIndex === "number" && selectedStateIndex === entry.snapshotIndex;
            const canSelectSnapshot = typeof entry.snapshotIndex === "number";
            return (
              <button
                key={entry.key}
                className={[
                  "relative mb-2 w-full rounded-xl border p-2 text-left shadow-sm transition",
                  canSelectSnapshot ? "hover:translate-x-0.5" : "cursor-default",
                  active
                    ? "border-sky-300 bg-gradient-to-r from-sky-50 to-emerald-50"
                    : "border-slate-200 bg-white hover:border-sky-200"
                ].join(" ")}
                onClick={() => {
                  if (canSelectSnapshot) {
                    onSelectState(entry.snapshotIndex);
                  }
                }}
              >
                {active && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-500" />}
                <span className="block text-xs font-bold text-slate-800">{entry.node}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-600">Step {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <span className={`badge ${statusBadgeClass(entry.status)}`}>{entry.status || "UNKNOWN"}</span>
                  </div>
                  <span className="badge border-slate-200 bg-slate-50 text-sky-700">
                    {shortenId(entry.checkpoint || "no-checkpoint", 6)}
                  </span>
                </span>
                {entry.source === "nodeExecution" && (
                  <span className="mt-1 block text-[10px] text-slate-600">
                    Attempt {entry.attemptNo ?? 1}
                    {typeof entry.rowsWritten === "number" ? ` | rows ${entry.rowsWritten}` : ""}
                  </span>
                )}
                {entry.errorMessage ? (
                  <span className="mt-1 block text-[10px] text-rose-700">Fail reason: {entry.errorMessage}</span>
                ) : (
                  <span className="mt-1 block break-all text-[10px] text-slate-500">
                    {entry.checkpoint || "no-checkpoint"}
                  </span>
                )}
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
