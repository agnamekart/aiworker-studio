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
    <section className="panel states-panel panel-slate">
      <div className="panel-head">
        <h2>State Timeline</h2>
      </div>

      <div className="timeline-summary">
        <span className="timeline-chip">States: {executionSnapshots.length}</span>
        <span className="timeline-chip">Nodes: {selectedExecutionUniqueNodeCount}</span>
        <span className="timeline-chip">
          Position: {selectedStatePosition || 0}/{executionSnapshots.length || 0}
        </span>
        <div className="timeline-progress-track" aria-hidden>
          <div
            className="timeline-progress-fill"
            style={{
              width:
                executionSnapshots.length > 0
                  ? `${Math.round((selectedStatePosition / executionSnapshots.length) * 100)}%`
                  : "0%"
            }}
          />
        </div>
      </div>

      <div className="timeline-grid">
        <aside className="state-list">
          <div className="state-list-head">
            <strong>Execution States</strong>
            <span>{executionSnapshots.length} total</span>
          </div>

          {executionSnapshots.map((snapshot, index) => (
            <button
              key={snapshot.key}
              className={`state-item ${selectedState?.key === snapshot.key ? "active" : ""}`}
              onClick={() => onSelectState(snapshot.index)}
            >
              <span className="node">{snapshot.node}</span>
              <span className="state-item-meta">
                <span className="state-step">Step {index + 1}</span>
                <span className={`state-phase ${snapshot.isResumePhase ? "resume" : "base"}`}>
                  {snapshot.isResumePhase ? `RESUME P${snapshot.phase}` : `BASE P${snapshot.phase}`}
                </span>
                <span className="state-cp">{shortenId(snapshot.checkpoint || "no-checkpoint", 6)}</span>
              </span>
              <span className="checkpoint">{snapshot.checkpoint || "no-checkpoint"}</span>
            </button>
          ))}

          {!selectedExecution && <p className="empty">Select a thread to inspect state</p>}
        </aside>

        <article className="state-viewer">
          <div className="state-viewer-head">
            <h3>{selectedState?.node || "State Payload"}</h3>
            <span>Checkpoint: {selectedState?.checkpoint || "none"}</span>
          </div>

          {selectedState ? (
            <>
              <div className="state-section-toolbar">
                <label>State Section</label>
                <select
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
                <div className="overview-grid">
                  {stateOverview.map((entry) => (
                    <div className="overview-card" key={entry.key}>
                      <div className="overview-key">{entry.key}</div>
                      <div className="overview-type">{entry.type}</div>
                      <div className="overview-value">{entry.summary}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <ParsedValue value={selectedSectionValue} />
              )}

              <div className="raw-json-actions">
                <button type="button" className="ghost raw-json-btn" onClick={onOpenRawSnapshot}>
                  View Raw Snapshot JSON
                </button>
              </div>
            </>
          ) : (
            <p className="empty">No state selected</p>
          )}
        </article>
      </div>
    </section>
  );
}
