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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="relative my-auto w-full max-w-[1280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal header ── */}
        <div
          className="relative overflow-hidden px-6 pb-5 pt-6"
          style={{ background: "linear-gradient(135deg, #1a4060 0%, #1e5278 35%, #1a5080 65%, #163a60 100%)" }}
        >
          {/* glow */}
          <span className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-sky-400/10 blur-[60px]" />
          <span className="pointer-events-none absolute -right-6 top-0 h-40 w-40 rounded-full bg-blue-300/10 blur-[50px]" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/70">Operations</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">Execution Controls</h2>
              <p className="mt-1 text-sm text-white/50">Resume paused runs or launch reruns with validated parameters.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white active:scale-95"
                onClick={hydrateFromSelectedThread}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2zm0 5v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Load Thread Context
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white active:scale-95"
                onClick={onClose}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <StatusBanner status={status} />

          {/* Forms */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Resume */}
            <FormCard
              title="Resume"
              subtitle="Continue a paused workflow from a chosen node."
              accentClass="border-sky-500"
              badge="Continue Existing"
              badgeClass="border-sky-200 bg-sky-50 text-sky-700"
              icon={
                /* Play / unpause icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5v14l11-7L8 5z" fill="currentColor"/>
                </svg>
              }
              iconClass="bg-sky-100 text-sky-600"
              action={
                <button
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-400 active:scale-95"
                  onClick={submitResume}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>
                  Resume Run
                </button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Requested By" className="mt-3">
                <input value={resumeForm.requestedBy} onChange={(e) => setResumeForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="admin" />
              </Field>
              <CheckboxField
                label="Test Mode"
                checked={resumeForm.testMode}
                onChange={(v) => setResumeForm(p => ({ ...p, testMode: v }))}
              />
              <Field label="Webhook JSON (optional)" className="mt-3">
                <textarea
                  className="min-h-[110px] resize-y font-mono text-xs leading-relaxed"
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
              accentClass="border-emerald-500"
              badge="New Attempt"
              badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              icon={
                /* Refresh / rerun icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L11 10h7V3l-2.35 3.35z" fill="currentColor"/>
                </svg>
              }
              iconClass="bg-emerald-100 text-emerald-600"
              action={
                <button
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95"
                  onClick={submitRerun}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L11 10h7V3l-2.35 3.35z" fill="currentColor"/></svg>
                  Start Rerun
                </button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Requested By" className="mt-3">
                <input value={rerunForm.requestedBy} onChange={(e) => setRerunForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="admin" />
              </Field>
              <CheckboxField
                label="Test Mode"
                checked={rerunForm.testMode}
                onChange={(v) => setRerunForm(p => ({ ...p, testMode: v }))}
              />
              <Field label="Rerun Reason" className="mt-3">
                <input value={rerunForm.rerunReason} onChange={(e) => setRerunForm(p => ({ ...p, rerunReason: e.target.value }))} />
              </Field>
            </FormCard>
          </div>

          {/* Graph workspace */}
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/60">
            <summary className="flex cursor-pointer items-center gap-2.5 px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] text-slate-500 shadow-sm">⬡</span>
              Domain Graph Workspace
              <svg className="ml-auto transition-transform duration-200 group-open:rotate-180" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </summary>
            <div className="border-t border-slate-200 p-5 space-y-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {graphSvg ? (
                  <div className="overflow-auto p-4" dangerouslySetInnerHTML={{ __html: graphSvg }} />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xl opacity-40">⬡</span>
                    <p className="text-sm text-slate-400">Graph preview unavailable</p>
                  </div>
                )}
              </div>
              {graphRenderError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">!</span>
                  <p className="text-xs text-rose-600">{graphRenderError}</p>
                </div>
              )}
              <details className="rounded-xl border border-slate-200 overflow-hidden">
                <summary className="cursor-pointer bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition">
                  Mermaid Source
                </summary>
                <pre className="scrollbar-dark max-h-[260px] overflow-auto bg-slate-950 p-4 font-mono text-xs leading-6 text-sky-100">
                  {graphMermaid || "No graph payload loaded."}
                </pre>
              </details>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

function FormCard({ title, subtitle, badge, badgeClass, accentClass, icon, iconClass, children, action }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition hover:shadow-md ${accentClass}`}>
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <span className={`badge text-[9px] ${badgeClass}`}>{badge}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 px-5 py-4">
        {children}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
        {action}
      </div>
    </div>
  );
}

function Field({ children, className = "", label }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${checked ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"}`}>
        {checked && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </span>
      {label}
    </label>
  );
}

function StatusBanner({ status }) {
  const styles = {
    error:   { wrap: "border-rose-200 bg-rose-50",     icon: "bg-rose-500 text-white",     text: "text-rose-700",     label: "text-rose-500",     symbol: "✕" },
    success: { wrap: "border-emerald-200 bg-emerald-50", icon: "bg-emerald-500 text-white", text: "text-emerald-700", label: "text-emerald-500", symbol: "✓" },
    neutral: { wrap: "border-slate-200 bg-slate-50",   icon: "bg-slate-400 text-white",    text: "text-slate-600",    label: "text-slate-400",    symbol: "·" },
  };
  const s = styles[status.type] ?? styles.neutral;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.wrap}`}>
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.icon}`}>
        {s.symbol}
      </span>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${s.label}`}>Status</p>
        <p className={`mt-0.5 text-xs leading-relaxed ${s.text}`}>{status.message}</p>
      </div>
    </div>
  );
}
