export default function TopBar({
  loading,
  onOpenControls,
  onRefreshData,
  onRefreshGraph,
  selectedThreadId,
  totalExecutions,
  totalStates,
  threadsCount
}) {
  return (
    <header className="relative mb-4 flex flex-col gap-5 overflow-hidden rounded-3xl border border-sky-100/30 bg-gradient-to-br from-sky-950/95 via-cyan-900/95 to-teal-800/90 p-6 text-sky-50 shadow-strong animate-[fadein_380ms_ease-out] lg:flex-row lg:items-start lg:justify-between">
      <span className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl animate-[floaty_7s_ease-in-out_infinite]" />
      <span className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl animate-[floaty_9s_ease-in-out_infinite_reverse]" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.14),transparent_38%)] animate-pulse" />
      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-2 animate-[fadein_520ms_ease-out]">
          <span className="text-[11px] font-bold uppercase tracking-[0.75px] text-sky-200">LangGraph Runtime</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.75px] text-sky-300">Observability + Control</span>
        </div>

        <h1 className="bg-[linear-gradient(90deg,#e0f2fe,#67e8f9,#a7f3d0,#e0f2fe)] bg-[length:220%_100%] bg-clip-text text-4xl font-extrabold leading-none tracking-tight text-transparent animate-[fadein_620ms_ease-out,gradientshift_6s_linear_infinite] md:text-5xl">
          AI Worker Studio
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sky-100 animate-[fadein_720ms_ease-out]">
          Operational dashboard for thread history, state inspection, and execution control.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 animate-[fadein_820ms_ease-out]">
          <span className="rounded-full border border-sky-100/40 bg-slate-900/30 px-3 py-1 text-[11px] font-bold">
            Threads {threadsCount}
          </span>
          <span className="rounded-full border border-sky-100/40 bg-slate-900/30 px-3 py-1 text-[11px] font-bold">
            Executions {totalExecutions}
          </span>
          <span className="rounded-full border border-sky-100/40 bg-slate-900/30 px-3 py-1 text-[11px] font-bold">
            States {totalStates}
          </span>
          <span className="max-w-xs truncate rounded-full border border-teal-100/40 bg-teal-900/40 px-3 py-1 text-[11px] font-bold">
            Selected {selectedThreadId || "none"}
          </span>
        </div>
      </div>

      <div className="relative z-10 min-w-[280px] rounded-2xl border border-sky-100/30 bg-slate-900/30 p-3 backdrop-blur animate-[fadein_920ms_ease-out]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button className="btn-primary h-10 border-sky-300 bg-gradient-to-br from-sky-500 to-sky-600" onClick={onRefreshData} disabled={loading}>
            Refresh Data
          </button>
          <button className="btn-ghost h-10 border-sky-100/40 bg-sky-950/40 text-sky-100 hover:bg-sky-900/50" onClick={onRefreshGraph}>
            Refresh Graph
          </button>
          <button className="btn-ghost h-10 border-sky-100/40 bg-sky-950/40 text-sky-100 hover:bg-sky-900/50" onClick={onOpenControls}>
            Execution Controls
          </button>
        </div>
        <p className="mt-2 text-[11px] text-sky-100/90">
          Live data from <code className="rounded bg-slate-900/40 px-1">/init</code> and{" "}
          <code className="rounded bg-slate-900/40 px-1">/api/langgraph/*</code>
        </p>
      </div>
    </header>
  );
}
