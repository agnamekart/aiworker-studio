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
    <div className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm" onClick={onClose}>
      <section
        className="panel mx-auto max-h-[calc(100vh-24px)] w-full max-w-[1220px] overflow-auto border-slate-200 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Execution Controls</h2>
            <p className="text-sm text-slate-600">
              Resume paused runs or launch reruns with validated runtime parameters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={hydrateFromSelectedThread}>
              Load Selected Thread Context
            </button>
            <button className="btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <StatusBanner status={status} />

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Resume</h3>
                <p className="text-xs text-slate-600">Continue a paused workflow from a chosen node.</p>
              </div>
              <span className="badge border-sky-200 bg-sky-50 text-sky-700">Continue Existing Flow</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Campaign ID">
                <input
                  value={resumeForm.campaignId}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, campaignId: event.target.value }))}
                />
              </Field>
              <Field label="Domain Name">
                <input
                  value={resumeForm.domainName}
                  onChange={(event) => setResumeForm((prev) => ({ ...prev, domainName: event.target.value }))}
                />
              </Field>
              <Field label="Start Node">
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
              </Field>
              <Field label="Strategy Mode">
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
              </Field>
            </div>

            <Field label="Requested By" className="mt-2">
              <input
                value={resumeForm.requestedBy}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, requestedBy: event.target.value }))}
                placeholder="admin"
              />
            </Field>

            <label className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-200/60">
              <input
                type="checkbox"
                checked={resumeForm.testMode}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, testMode: event.target.checked }))}
              />
              Test Mode
            </label>

            <Field label="Webhook JSON (optional)" className="mt-2">
              <textarea
                className="min-h-[140px] w-full resize-y font-mono text-xs leading-6"
                value={resumeForm.webhookData}
                onChange={(event) => setResumeForm((prev) => ({ ...prev, webhookData: event.target.value }))}
                placeholder='{"domain":"example.com","campaignId":123,"leads":[]}'
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Optional payload for resume webhook simulation.
              </p>
            </Field>

            <div className="mt-4 flex justify-end">
              <button className="btn-primary px-4 py-2.5" onClick={submitResume}>
                Resume
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Rerun</h3>
                <p className="text-xs text-slate-600">Start a fresh attempt linked to a parent campaign.</p>
              </div>
              <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Create New Attempt</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Parent Campaign ID">
                <input
                  value={rerunForm.parentCampaignId}
                  onChange={(event) =>
                    setRerunForm((prev) => ({ ...prev, parentCampaignId: event.target.value }))
                  }
                />
              </Field>
              <Field label="Domain Name">
                <input
                  value={rerunForm.domainName}
                  onChange={(event) => setRerunForm((prev) => ({ ...prev, domainName: event.target.value }))}
                />
              </Field>
              <Field label="Start Node">
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
              </Field>
              <Field label="Strategy Mode">
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
              </Field>
            </div>

            <Field label="Requested By" className="mt-2">
              <input
                value={rerunForm.requestedBy}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, requestedBy: event.target.value }))}
                placeholder="admin"
              />
            </Field>

            <label className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-200/60">
              <input
                type="checkbox"
                checked={rerunForm.testMode}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, testMode: event.target.checked }))}
              />
              Test Mode
            </label>

            <Field label="Rerun Reason" className="mt-2">
              <input
                value={rerunForm.rerunReason}
                onChange={(event) => setRerunForm((prev) => ({ ...prev, rerunReason: event.target.value }))}
              />
            </Field>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                onClick={submitRerun}
              >
                Rerun
              </button>
            </div>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <summary className="text-sm font-semibold text-slate-700">Domain Graph Workspace</summary>

          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {graphSvg ? (
              <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: graphSvg }} />
            ) : (
              <p className="text-sm text-slate-500">Graph preview unavailable.</p>
            )}
          </div>

          {graphRenderError && (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600">
              {graphRenderError}. Raw source is still available below.
            </p>
          )}

          <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <summary className="text-xs font-semibold text-slate-700">Mermaid Source</summary>
            <pre className="mt-2 max-h-[280px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-6 text-sky-100">
              {graphMermaid || "No graph payload loaded."}
            </pre>
          </details>
        </details>
      </section>
    </div>
  );
}

function Field({ children, className = "", label }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function StatusBanner({ status }) {
  const tone =
    status.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${tone}`}>
      <strong className="text-xs uppercase tracking-wide">Status</strong>
      <p className="mt-1">{status.message}</p>
    </div>
  );
}
