import { DEFAULT_STRATEGIES } from "../utils/studioUtils";

export default function ExecutionControlsModal({
  controlsOpen,
  graphMermaid,
  graphRenderError,
  graphSvg,
  hydrateFromSelectedThread,
  onClose,
  rerunForm,
  resumeForm,
  setRerunForm,
  setResumeForm,
  startNodes,
  status,
  submitRerun,
  submitResume
}) {
  if (!controlsOpen) {
    return null;
  }

  return (
    <div className="controls-overlay" onClick={onClose}>
      <section className="panel actions-panel panel-sand controls-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div className="controls-title-wrap">
            <h2>Execution Controls</h2>
            <p className="controls-subtitle">
              Resume paused runs or launch reruns with validated runtime parameters.
            </p>
          </div>
          <div className="controls-head-actions">
            <button className="ghost controls-ghost" onClick={hydrateFromSelectedThread}>
              Load Selected Thread Context
            </button>
            <button className="ghost close-btn controls-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="card resume-card">
            <div className="card-head">
              <h3>Resume</h3>
              <span className="mode-badge">Continue Existing Flow</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Campaign ID</label>
                <input
                  value={resumeForm.campaignId}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, campaignId: event.target.value }))}
                />
              </div>

              <div className="field">
                <label>Domain Name</label>
                <input
                  value={resumeForm.domainName}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, domainName: event.target.value }))}
                />
              </div>

              <div className="field">
                <label>Start Node</label>
                <select
                  value={resumeForm.startNode}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, startNode: event.target.value }))}
                >
                  {startNodes.map((node) => (
                    <option value={node} key={node}>
                      {node}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Strategy Mode</label>
                <select
                  value={resumeForm.strategyMode}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, strategyMode: event.target.value }))}
                >
                  {DEFAULT_STRATEGIES.map((mode) => (
                    <option value={mode} key={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Requested By</label>
              <input
                value={resumeForm.requestedBy}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, requestedBy: event.target.value }))}
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={resumeForm.testMode}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, testMode: event.target.checked }))}
              />
              Test Mode
            </label>

            <div className="field">
              <label>Webhook JSON (optional)</label>
              <textarea
                value={resumeForm.webhookData}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, webhookData: event.target.value }))}
                placeholder='{"domain":"example.com","campaignId":123,"leads":[]}'
              />
            </div>

            <div className="card-actions">
              <button className="controls-submit resume-submit" onClick={submitResume}>
                Resume
              </button>
            </div>
          </div>

          <div className="card rerun-card">
            <div className="card-head">
              <h3>Rerun</h3>
              <span className="mode-badge">Create New Attempt</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Parent Campaign ID</label>
                <input
                  value={rerunForm.parentCampaignId}
                  onChange={(event) =>
                    setRerunForm((prev) => ({ ...prev, parentCampaignId: event.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>Domain Name</label>
                <input
                  value={rerunForm.domainName}
                  onChange={(event) => setRerunForm((prev) => ({ ...prev, domainName: event.target.value }))}
                />
              </div>

              <div className="field">
                <label>Start Node</label>
                <select
                  value={rerunForm.startNode}
                  onChange={(event) => setRerunForm((prev) => ({ ...prev, startNode: event.target.value }))}
                >
                  {startNodes.map((node) => (
                    <option value={node} key={node}>
                      {node}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Strategy Mode</label>
                <select
                  value={rerunForm.strategyMode}
                  onChange={(event) => setRerunForm((prev) => ({ ...prev, strategyMode: event.target.value }))}
                >
                  {DEFAULT_STRATEGIES.map((mode) => (
                    <option value={mode} key={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Requested By</label>
              <input
                value={rerunForm.requestedBy}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, requestedBy: event.target.value }))}
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={rerunForm.testMode}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, testMode: event.target.checked }))}
              />
              Test Mode
            </label>

            <div className="field">
              <label>Rerun Reason</label>
              <input
                value={rerunForm.rerunReason}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, rerunReason: event.target.value }))}
              />
            </div>

            <div className="card-actions">
              <button className="teal controls-submit rerun-submit" onClick={submitRerun}>
                Rerun
              </button>
            </div>
          </div>
        </div>

        <div className={`status ${status.type}`}>
          <strong>Status</strong>
          <p>{status.message}</p>
        </div>

        <details className="graph-view">
          <summary>Domain Graph (Mermaid)</summary>

          <div className="graph-canvas-wrap">
            {graphSvg ? (
              <div className="graph-canvas" dangerouslySetInnerHTML={{ __html: graphSvg }} />
            ) : (
              <p className="empty">Graph preview unavailable.</p>
            )}
          </div>

          {graphRenderError && (
            <p className="graph-error">{graphRenderError}. Raw source is still available below.</p>
          )}

          <details className="raw-json-toggle">
            <summary>Mermaid Source</summary>
            <pre className="raw-json">{graphMermaid || "No graph payload loaded."}</pre>
          </details>
        </details>
      </section>
    </div>
  );
}
