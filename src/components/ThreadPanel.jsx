import { shortenId } from "../utils/studioUtils";

const STATUS_STYLES = {
  FAILED:    { border: "border-l-rose-400",    dot: "bg-rose-400",    badge: "border-rose-200 bg-rose-50 text-rose-700" },
  COMPLETED: { border: "border-l-emerald-400", dot: "bg-emerald-400", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  RUNNING:   { border: "border-l-sky-400",     dot: "bg-sky-400",     badge: "border-sky-200 bg-sky-50 text-sky-700" },
  QUEUED:    { border: "border-l-sky-300",     dot: "bg-sky-300",     badge: "border-sky-200 bg-sky-50 text-sky-700" },
  PAUSED:    { border: "border-l-amber-400",   dot: "bg-amber-400",   badge: "border-amber-200 bg-amber-50 text-amber-700" },
  DEFAULT:   { border: "border-l-slate-300",   dot: "bg-slate-300",   badge: "border-slate-200 bg-slate-50 text-slate-600" },
};

function getStatusStyle(status) {
  return STATUS_STYLES[String(status || "").toUpperCase()] ?? STATUS_STYLES.DEFAULT;
}

export default function ThreadPanel({
  filteredThreads,
  nestedThreads,
  onCopyThreadId,
  onSelectThread,
  selectedThread,
  selectedThreadId,
  threadFilter,
  threadSort,
  setThreadFilter,
  setThreadSort,
  pagination,
  onGoToPage
}) {
  return (
    <section className="panel flex h-[calc(100vh-260px)] min-h-[520px] flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">Threads</h2>
        <span className="badge border-slate-200 bg-slate-50 text-slate-500">
          {pagination?.totalCount ?? filteredThreads.length} total
        </span>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">⌕</span>
          <input
            value={threadFilter}
            onChange={(e) => setThreadFilter(e.target.value)}
            placeholder="Search campaign or domain…"
            className="pl-7 text-xs"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <select value={threadSort} onChange={(e) => setThreadSort(e.target.value)} className="flex-1 text-xs">
            <option value="time_desc">Latest first</option>
            <option value="id_asc">ID A–Z</option>
          </select>
          <span className="shrink-0 text-[11px] text-slate-400">{filteredThreads.length} shown</span>
        </div>
      </div>

      {/* Selected thread info */}
      {selectedThread && (
        <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-slate-50 p-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-500">Selected</p>
          <p className="mb-1.5 break-all font-mono text-xs font-semibold text-slate-700">{selectedThread.threadId}</p>
          <div className="flex flex-wrap gap-1">
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              C-{selectedThread.campaignId ?? "?"}
            </span>
            <span className="badge border-sky-200 bg-sky-50 text-sky-700 max-w-[120px] truncate">
              {selectedThread.domainName ?? "unknown"}
            </span>
            {selectedThread.runStatus && (
              <span className={`badge ${getStatusStyle(selectedThread.runStatus).badge}`}>
                {selectedThread.runStatus}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-0.5">
        {nestedThreads.map(({ thread, depth }) => {
          const isActive = thread.threadId === selectedThreadId;
          const style = getStatusStyle(thread.runStatus);
          const execCount = thread.domainGraphExecutions?.length ?? thread.executions?.length ?? 0;

          return (
            <div
              key={thread.threadId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectThread(thread.threadId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectThread(thread.threadId);
                }
              }}
              className={[
                "thread-card border-l-4 outline-none",
                style.border,
                depth === 1 ? "ml-3" : "",
                isActive ? "active" : "inactive"
              ].join(" ")}
            >
              {/* Top row: status dot + domain + type badge */}
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <span className="truncate text-xs font-semibold text-slate-700">
                    {thread.domainName ?? "unknown domain"}
                  </span>
                </div>
                <span
                  className={`shrink-0 badge text-[9px] ${
                    thread.threadType === "RERUN"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {thread.threadType}
                </span>
              </div>

              {/* Campaign + executions */}
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-amber-700">
                  Campaign {thread.campaignId ?? "–"}
                </span>
                <span className="text-slate-400">{execCount} execution{execCount !== 1 ? "s" : ""}</span>
              </div>

              {/* Thread ID + status + copy */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-slate-400" title={thread.threadId}>
                  {shortenId(thread.threadId, 12)}
                </span>
                <div className="flex items-center gap-1">
                  {thread.runStatus && (
                    <span className={`badge text-[9px] ${style.badge}`}>{thread.runStatus}</span>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyThreadId(thread.threadId);
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {nestedThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium text-slate-500">No threads found</p>
            {threadFilter && (
              <p className="text-xs text-slate-400">Try a different search term</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            disabled={pagination.page <= 0}
            onClick={() => onGoToPage(pagination.page - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            ‹
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => {
              const p = pagination.page;
              const show = i === 0 || i === pagination.totalPages - 1 || Math.abs(i - p) <= 1;
              const isDot = !show && (i === 1 || i === pagination.totalPages - 2);
              if (isDot) return <span key={i} className="text-[10px] text-slate-400">…</span>;
              if (!show) return null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onGoToPage(i)}
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-semibold transition",
                    i === p
                      ? "bg-sky-500 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  ].join(" ")}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages - 1}
            onClick={() => onGoToPage(pagination.page + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
