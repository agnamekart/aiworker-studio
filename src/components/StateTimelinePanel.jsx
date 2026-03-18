import ParsedValue from "./ParsedValue";
import { shortenId } from "../utils/studioUtils";

/* ─── status helpers ─────────────────────────────────────────── */
const STATUS = {
  FAILED:    { border: "border-l-rose-400",    badge: "border-rose-200 bg-rose-50 text-rose-700",         circle: "bg-rose-100 text-rose-600" },
  COMPLETED: { border: "border-l-emerald-400", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", circle: "bg-emerald-100 text-emerald-600" },
  STARTED:   { border: "border-l-sky-400",     badge: "border-sky-200 bg-sky-50 text-sky-700",            circle: "bg-sky-100 text-sky-600" },
  RUNNING:   { border: "border-l-sky-400",     badge: "border-sky-200 bg-sky-50 text-sky-700",            circle: "bg-sky-100 text-sky-600" },
  SKIPPED:   { border: "border-l-amber-400",   badge: "border-amber-200 bg-amber-50 text-amber-700",      circle: "bg-amber-100 text-amber-600" },
  PAUSED:    { border: "border-l-amber-400",   badge: "border-amber-200 bg-amber-50 text-amber-700",      circle: "bg-amber-100 text-amber-600" },
};
const DEFAULT_STATUS = { border: "border-l-slate-300", badge: "border-slate-200 bg-slate-50 text-slate-600", circle: "bg-slate-100 text-slate-500" };
function getStatus(s) { return STATUS[String(s || "").toUpperCase()] ?? DEFAULT_STATUS; }

/* ─── type helpers for overview cards ───────────────────────── */
const TYPE_STYLE = {
  string:  { card: "border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white", badge: "border-emerald-200 bg-emerald-100 text-emerald-700", icon: "Aa" },
  number:  { card: "border-orange-200 bg-gradient-to-b from-orange-50/60 to-white",  badge: "border-orange-200 bg-orange-100 text-orange-700",  icon: "#"  },
  boolean: { card: "border-teal-200 bg-gradient-to-b from-teal-50/60 to-white",      badge: "border-teal-200 bg-teal-100 text-teal-700",        icon: "⚑"  },
  array:   { card: "border-sky-200 bg-gradient-to-b from-sky-50/40 to-white",        badge: "border-sky-200 bg-sky-100 text-sky-700",           icon: "[ ]" },
  object:  { card: "border-violet-200 bg-gradient-to-b from-violet-50/40 to-white",  badge: "border-violet-200 bg-violet-100 text-violet-700",  icon: "{ }" },
  null:    { card: "border-slate-200 bg-slate-50/60",                                badge: "border-slate-200 bg-slate-100 text-slate-500",     icon: "∅"  },
};
function getTypeStyle(type) { return TYPE_STYLE[String(type || "").toLowerCase()] ?? TYPE_STYLE.null; }

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
  const progressPct = timelineEntries.length > 0
    ? Math.round((selectedStatePosition / timelineEntries.length) * 100)
    : 0;

  return (
    <section className="panel flex h-[calc(100vh-260px)] min-h-[520px] flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">State Timeline</h2>
        {graphExecutions.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exec</span>
            <select
              className="border-0 bg-transparent p-0 text-xs font-semibold text-slate-700 shadow-none ring-0 focus:ring-0"
              value={selectedGraphExecutionId}
              onChange={(e) => onSelectGraphExecution?.(e.target.value)}
            >
              {graphExecutions.map((exec, i) => (
                <option key={exec.id ?? `${exec.startedAtMs}_${exec.mode}`} value={String(exec.id)}>
                  #{graphExecutions.length - i} · {exec.status ?? "UNKNOWN"}
                  {exec.startedAtMs ? ` · ${new Date(exec.startedAtMs).toLocaleDateString()}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <Chip color="sky">{timelineEntries.length} states</Chip>
        <Chip color="indigo">{selectedExecutionUniqueNodeCount} nodes</Chip>
        <Chip color="slate">{selectedStatePosition || 0}/{timelineEntries.length || 0}</Chip>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="w-9 text-right text-[11px] font-bold tabular-nums text-slate-500">{progressPct}%</span>
      </div>

      {/* ── Two-column body ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[264px_minmax(0,1fr)]">

        {/* Timeline sidebar */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Execution States</span>
            <span className="badge border-slate-200 bg-white text-slate-500">{timelineEntries.length}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2 space-y-1">
            {timelineEntries.map((entry, index) => {
              const active = typeof entry.snapshotIndex === "number" && selectedStateIndex === entry.snapshotIndex;
              const canSelect = typeof entry.snapshotIndex === "number";
              const s = getStatus(entry.status);

              return (
                <button
                  key={entry.key}
                  className={[
                    "relative w-full rounded-xl border-l-[3px] px-2 py-2 text-left outline-none transition-all duration-100",
                    s.border,
                    canSelect ? "cursor-pointer" : "cursor-default",
                    active
                      ? "border border-sky-200 border-l-sky-400 bg-sky-50/70 shadow-sm"
                      : "border border-transparent hover:border-slate-200 hover:bg-slate-50"
                  ].join(" ")}
                  onClick={() => canSelect && onSelectState(entry.snapshotIndex)}
                >
                  {active && (
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-500" />
                  )}

                  {/* Step number + node name */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${s.circle}`}>
                      {index + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-800">{entry.node}</span>
                  </div>

                  {/* Status + meta */}
                  <div className="flex flex-wrap items-center gap-1 pl-7">
                    <span className={`badge text-[9px] ${s.badge}`}>{entry.status || "UNKNOWN"}</span>
                    {entry.source === "nodeExecution" && (
                      <span className="badge border-slate-200 bg-slate-50 text-[9px] text-slate-500">
                        ×{entry.attemptNo ?? 1}
                        {typeof entry.rowsWritten === "number" ? ` · ${entry.rowsWritten}r` : ""}
                      </span>
                    )}
                  </div>

                  {/* Error or checkpoint */}
                  {entry.errorMessage ? (
                    <p className="mt-1 pl-7 text-[10px] font-medium leading-snug text-rose-600 line-clamp-2">
                      {entry.errorMessage}
                    </p>
                  ) : (
                    <p className="mt-0.5 pl-7 font-mono text-[9px] text-slate-400">
                      {shortenId(entry.checkpoint || "–", 8)}
                    </p>
                  )}
                </button>
              );
            })}

            {!selectedExecution && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <span className="text-2xl opacity-30">⏱</span>
                <p className="text-xs text-slate-400">Select a thread to inspect states</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── State detail ── */}
        <article className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">

          {/* Article header */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedState?.node || "State Payload"}
              </h3>
              {selectedState?.checkpoint && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                  {selectedState.checkpoint}
                </p>
              )}
            </div>
            {selectedState && (
              <button
                type="button"
                className="btn-ghost shrink-0 border-sky-200 bg-sky-50/80 text-[11px] text-sky-600 hover:bg-sky-100"
                onClick={onOpenRawSnapshot}
              >
                Raw JSON
              </button>
            )}
          </div>

          {selectedState ? (
            <>
              {/* Scrollable section tabs */}
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/60">
                <div className="flex gap-0.5 overflow-x-auto px-3 py-1.5">
                  {stateSections.map((s) => {
                    const active = selectedStateSectionKey === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSelectedStateSectionKey(s.key)}
                        className={[
                          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-100",
                          active
                            ? "bg-white text-sky-700 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                        ].join(" ")}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {selectedStateSectionKey === "__overview" ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {stateOverview.map((entry) => {
                      const typeStr = String(entry.type || "").toLowerCase();
                      const ts = getTypeStyle(typeStr);
                      const isLarge = typeStr.includes("array") || typeStr.includes("object");
                      return (
                        <div
                          key={entry.key}
                          className={[
                            "rounded-xl border p-3 transition hover:shadow-sm",
                            ts.card,
                            isLarge ? "sm:col-span-2 xl:col-span-3" : ""
                          ].join(" ")}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[9px] font-bold ${ts.badge}`}>
                                {ts.icon}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{entry.key}</span>
                            </span>
                            <span className={`badge text-[9px] ${ts.badge}`}>{entry.type}</span>
                          </div>
                          <p className="break-all pl-7 text-xs text-slate-500">{entry.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ParsedValue value={selectedSectionValue} />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl">
                📋
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-500">No state selected</p>
                <p className="mt-0.5 text-xs text-slate-400">Click a step in the timeline</p>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function Chip({ children, color = "slate" }) {
  const colors = {
    sky:    "border-sky-200 bg-sky-50 text-sky-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    slate:  "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span className={`badge ${colors[color] ?? colors.slate}`}>{children}</span>
  );
}
