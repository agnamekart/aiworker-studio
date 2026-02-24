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
    <div className="json-overlay" onClick={onClose}>
      <section className="panel json-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div className="json-head-content">
            <h2>Raw Snapshot JSON</h2>
            <div className="json-head-meta">
              <span className="json-meta-chip">Node: {selectedState?.node ?? "unknown"}</span>
              <span className="json-meta-chip">
                Checkpoint: {shortenId(selectedState?.checkpoint || "none", 8)}
              </span>
            </div>
          </div>
          <div className="json-head-actions">
            <button type="button" className="ghost raw-json-copy-btn" onClick={onCopy}>
              Copy JSON
            </button>
            <button type="button" className="ghost close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="raw-json raw-json-full">
          {selectedState ? safeJson(selectedState.raw) : "No snapshot selected."}
        </pre>
      </section>
    </div>
  );
}
