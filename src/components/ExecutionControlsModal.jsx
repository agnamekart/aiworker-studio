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
  if (!controlsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="panel my-auto w-full max-w-[1240px] border-slate-200 bg-white shadow-strong"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 pb-4 pt-5">
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Operations</p>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-800">Execution Controls</h2>
            <p className="mt-0.5 text-xs text-slate-500">Resume paused runs or launch reruns with validated parameters.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost text-sky-600 border-sky-200 bg-sky-50/80 hover:bg-sky-100" onClick={hydrateFromSelectedThread}>
              ↙ Load Thread Context
            </button>
            <button className="btn-ghost" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        <StatusBanner status={status} />

        {/* Forms */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Resume */}
          <FormCard
            title="Resume"
            subtitle="Continue a paused workflow from a chosen node."
            badge="Continue Existing Flow"
            badgeClass="border-sky-200 bg-sky-50 text-sky-700"
            action={<button className="btn-primary px-5 py-2" onClick={submitResume}>Resume →</button>}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Campaign ID">
                <input value={resumeForm.campaignId} onChange={(e) => setResumeForm(p => ({ ...p, campaignId: e.target.value }))} />
              </Field>
              <Field label="Domain Name">
                <input value={resumeForm.domainName} onChange={(e) => setResumeForm(p => ({ ...p, domainName: e.target.value }))} />
              </Field>
              <Field label="Start Node">
                <select value={resumeForm.startNode} onChange={(e) => setResumeForm(p => ({ ...p, startNode: e.target.value }))}>
                  {startNodes.map((n) => <option value={n} key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Strategy Mode">
                <select value={resumeForm.strategyMode} onChange={(e) => setResumeForm(p => ({ ...p, strategyMode: e.target.value }))}>
                  {DEFAULT_STRATEGIES.map((m) => <option value={m} key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Requested By" className="mt-2">
              <input value={resumeForm.requestedBy} onChange={(e) => setResumeForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="admin" />
            </Field>
            <CheckboxField
              label="Test Mode"
              checked={resumeForm.testMode}
              onChange={(v) => setResumeForm(p => ({ ...p, testMode: v }))}
            />
            <Field label="Webhook JSON (optional)" className="mt-2">
              <textarea
                className="min-h-[120px] resize-y font-mono text-xs leading-relaxed"
                value={resumeForm.webhookData}
                onChange={(e) => setResumeForm(p => ({ ...p, webhookData: e.target.value }))}
                placeholder='{"domain":"example.com","campaignId":123}'
              />
            </Field>
          </FormCard>

          {/* Rerun */}
          <FormCard
            title="Rerun"
            subtitle="Start a fresh attempt linked to a parent campaign."
            badge="Create New Attempt"
            badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
            action={
              <button
                className="rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 active:scale-95"
                onClick={submitRerun}
              >
                Rerun →
              </button>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Parent Campaign ID">
                <input value={rerunForm.parentCampaignId} onChange={(e) => setRerunForm(p => ({ ...p, parentCampaignId: e.target.value }))} />
              </Field>
              <Field label="Domain Name">
                <input value={rerunForm.domainName} onChange={(e) => setRerunForm(p => ({ ...p, domainName: e.target.value }))} />
              </Field>
              <Field label="Start Node">
                <select value={rerunForm.startNode} onChange={(e) => setRerunForm(p => ({ ...p, startNode: e.target.value }))}>
                  {startNodes.map((n) => <option value={n} key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Strategy Mode">
                <select value={rerunForm.strategyMode} onChange={(e) => setRerunForm(p => ({ ...p, strategyMode: e.target.value }))}>
                  {DEFAULT_STRATEGIES.map((m) => <option value={m} key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Requested By" className="mt-2">
              <input value={rerunForm.requestedBy} onChange={(e) => setRerunForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="admin" />
            </Field>
            <CheckboxField
              label="Test Mode"
              checked={rerunForm.testMode}
              onChange={(v) => setRerunForm(p => ({ ...p, testMode: v }))}
            />
            <Field label="Rerun Reason" className="mt-2">
              <input value={rerunForm.rerunReason} onChange={(e) => setRerunForm(p => ({ ...p, rerunReason: e.target.value }))} />
            </Field>
          </FormCard>
        </div>

        {/* Graph workspace */}
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
          <summary className="px-4 py-3 text-sm font-semibold text-slate-600 hover:text-slate-800">
            ⬡ Domain Graph Workspace
          </summary>
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              {graphSvg ? (
                <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: graphSvg }} />
              ) : (
                <p className="text-sm text-slate-400">Graph preview unavailable.</p>
              )}
            </div>
            {graphRenderError && (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {graphRenderError}
              </p>
            )}
            <details className="mt-3 rounded-lg border border-slate-200">
              <summary className="px-3 py-2 text-xs font-semibold text-slate-500">Mermaid Source</summary>
              <pre className="max-h-[260px] overflow-auto rounded-b-lg bg-slate-950 p-3 font-mono text-xs leading-6 text-sky-100">
                {graphMermaid || "No graph payload loaded."}
              </pre>
            </details>
          </div>
        </details>
      </section>
    </div>
  );
}

function FormCard({ title, subtitle, badge, badgeClass, children, action }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className={`badge mt-0.5 ${badgeClass}`}>{badge}</span>
      </div>
      <div className="flex-1 p-4">
        {children}
      </div>
      <div className="flex justify-end border-t border-slate-100 px-4 py-3">
        {action}
      </div>
    </div>
  );
}

function Field({ children, className = "", label }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function StatusBanner({ status }) {
  const styles = {
    error:   { cls: "border-rose-200 bg-rose-50 text-rose-700",     icon: "✕" },
    success: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: "✓" },
    neutral: { cls: "border-slate-200 bg-slate-50 text-slate-600",  icon: "·" },
  };
  const s = styles[status.type] ?? styles.neutral;

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${s.cls}`}>
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
        {s.icon}
      </span>
      <div>
        <strong className="text-[10px] font-bold uppercase tracking-wide">Status</strong>
        <p className="mt-0.5 text-xs leading-relaxed">{status.message}</p>
      </div>
    </div>
  );
}
