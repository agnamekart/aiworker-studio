import { shortenId } from "../utils/studioUtils";

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
  setThreadSort
}) {
  return (
    <section className="panel flex h-[calc(100vh-170px)] flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800">Threads</h2>
        <input
          className="w-full max-w-[220px]"
          value={threadFilter}
          onChange={(event) => setThreadFilter(event.target.value)}
          placeholder="Search campaign ID or domain"
        />
      </div>

      <div className="mb-3 flex items-end justify-between gap-2">
        <label className="flex min-w-[160px] flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Sort
          <select value={threadSort} onChange={(event) => setThreadSort(event.target.value)}>
            <option value="states_desc">Most states</option>
            <option value="id_asc">Thread ID A-Z</option>
          </select>
        </label>
        <span className="badge border-slate-200 bg-slate-50 text-slate-700">{filteredThreads.length} shown</span>
      </div>

      {selectedThread && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected Thread</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-800">{selectedThread.threadId}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="badge border-slate-200 bg-white text-slate-700">{selectedThread.snapshotCount} states</span>
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              campaign {selectedThread.campaignId ?? "unknown"}
            </span>
            <span className="badge border-sky-200 bg-sky-50 text-sky-700">
              domain {selectedThread.domainName ?? "unknown"}
            </span>
            <span className="badge border-slate-200 bg-white text-slate-700">
              {selectedThread.latestSnapshot?.node ?? "unknown"}
            </span>
            <span className="badge border-slate-200 bg-white text-slate-700">{selectedThread.threadType}</span>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        {nestedThreads.map(({ thread, depth }) => {
          const isActive = thread.threadId === selectedThreadId;
          return (
            <div
              key={thread.threadId}
              role="button"
              tabIndex={0}
              onClick={() => onSelectThread(thread.threadId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectThread(thread.threadId);
                }
              }}
              className={[
                "rounded-xl border p-3 text-left outline-none transition hover:-translate-y-0.5",
                depth === 1 ? "ml-4 border-l-4 border-l-slate-200" : "",
                isActive
                  ? "border-blue-200 bg-blue-50/60 shadow-sm"
                  : "border-slate-200 bg-white/90 hover:shadow"
              ].join(" ")}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <strong className="break-all text-xs text-slate-800" title={thread.threadId}>
                  {shortenId(thread.threadId, 10)}
                </strong>
                <span
                  className={`badge ${
                    thread.threadType === "RERUN"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {thread.threadType}
                </span>
              </div>
              <span className="block text-xs text-slate-600">{thread.snapshotCount} state(s)</span>
              <span className="block text-xs text-amber-700">Campaign: {thread.campaignId ?? "unknown"}</span>
              <span className="block text-xs text-sky-700">Domain: {thread.domainName ?? "unknown"}</span>
              <button
                type="button"
                className="mt-2 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopyThreadId(thread.threadId);
                }}
              >
                Copy ID
              </button>
            </div>
          );
        })}
        {nestedThreads.length === 0 && <p className="text-sm text-slate-500">No threads found</p>}
      </div>
    </section>
  );
}
