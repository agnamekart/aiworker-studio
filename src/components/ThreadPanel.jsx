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
    <section className="panel thread-panel panel-sky">
      <div className="panel-head">
        <h2>Threads</h2>
        <input
          value={threadFilter}
          onChange={(event) => setThreadFilter(event.target.value)}
          placeholder="Search campaign ID or domain"
        />
      </div>

      <div className="thread-tools">
        <label>
          Sort
          <select value={threadSort} onChange={(event) => setThreadSort(event.target.value)}>
            <option value="states_desc">Most states</option>
            <option value="id_asc">Thread ID A-Z</option>
          </select>
        </label>
        <span className="thread-count-chip">{filteredThreads.length} shown</span>
      </div>

      {selectedThread && (
        <div className="thread-selected-summary">
          <div>
            <p className="thread-selected-title">Selected Thread</p>
            <p className="thread-selected-id">{selectedThread.threadId}</p>
          </div>
          <div className="thread-selected-stats">
            <span>{selectedThread.snapshotCount} states</span>
            <span className="campaign-text">campaign {selectedThread.campaignId ?? "unknown"}</span>
            <span className="domain-text">domain {selectedThread.domainName ?? "unknown"}</span>
            <span>{selectedThread.latestSnapshot?.node ?? "unknown"}</span>
            <span>{selectedThread.threadType}</span>
          </div>
        </div>
      )}

      <div className="thread-list">
        {nestedThreads.map(({ thread, depth }, index) => (
          <div
            key={thread.threadId}
            className={`thread-item ${thread.threadId === selectedThreadId ? "active" : ""}`}
            style={{ animationDelay: `${Math.min(index * 30, 360)}ms` }}
            data-depth={depth}
            role="button"
            tabIndex={0}
            onClick={() => onSelectThread(thread.threadId)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectThread(thread.threadId);
              }
            }}
          >
            <div className="thread-item-top">
              <strong title={thread.threadId}>{shortenId(thread.threadId, 10)}</strong>
              <span className={`thread-type-badge ${thread.threadType === "RERUN" ? "rerun" : "normal"}`}>
                {thread.threadType}
              </span>
            </div>
            <span>{thread.snapshotCount} state(s)</span>
            <span className="campaign-text">Campaign: {thread.campaignId ?? "unknown"}</span>
            <span className="domain-text">Domain: {thread.domainName ?? "unknown"}</span>
            <button
              type="button"
              className="thread-copy-btn"
              onClick={(event) => {
                event.stopPropagation();
                onCopyThreadId(thread.threadId);
              }}
            >
              Copy ID
            </button>
          </div>
        ))}
        {nestedThreads.length === 0 && <p className="empty">No threads found</p>}
      </div>
    </section>
  );
}
