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
    <header
      className="relative mb-4 overflow-hidden rounded-2xl shadow-strong animate-[fadein_350ms_ease-out]"
      style={{
        background: "linear-gradient(135deg, #1a4060 0%, #1e5278 35%, #1a5080 65%, #163a60 100%)",
      }}
    >
      {/* Noise texture overlay */}
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "180px 180px" }}
      />
      {/* Ambient glows */}
      <span className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-300/[0.20] blur-[80px]" />
      <span className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full bg-blue-300/[0.18] blur-[70px]" />
      <span className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-sky-200/[0.12] blur-[60px]" />

      <div className="relative z-10 flex flex-col gap-0 lg:flex-row lg:items-stretch">

        {/* ── Left: brand ── */}
        <div className="flex flex-1 flex-col justify-between px-7 py-6">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-sky-300/80">
              LangGraph Runtime
            </span>
            <span className="h-1 w-1 rounded-full bg-sky-400" />
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-blue-300/70">
              Observability + Control
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-black leading-none tracking-tight text-white md:text-5xl">
              AI Worker Studio
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/40">
              Operational dashboard for thread history, state inspection, and execution control.
            </p>
          </div>

          {/* Stats pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <StatPill label="Threads" value={threadsCount} />
            <StatPill label="Executions" value={totalExecutions} />
            <StatPill label="States" value={totalStates} />
            {selectedThreadId && (
              <StatPill label="Selected" value={selectedThreadId} mono truncate />
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="hidden w-px bg-white/8 lg:block" />

        {/* ── Right: actions ── */}
        <div className="flex shrink-0 flex-col justify-center gap-3 border-t border-white/8 px-7 py-6 lg:border-t-0 lg:w-72">
          <button
            onClick={onRefreshData}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-bold text-white shadow-sm transition hover:bg-sky-400 active:scale-95 disabled:opacity-50"
          >
            {loading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.35L9 7h6V1l-1.35 1.35z" fill="currentColor"/></svg>
            }
            Refresh Data
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRefreshGraph}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 text-xs font-semibold text-white/80 transition hover:bg-white/14 hover:text-white active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-70"><circle cx="3" cy="8" r="2" fill="currentColor"/><circle cx="13" cy="3" r="2" fill="currentColor"/><circle cx="13" cy="13" r="2" fill="currentColor"/><line x1="5" y1="7.2" x2="11" y2="3.8" stroke="currentColor" strokeWidth="1.4"/><line x1="5" y1="8.8" x2="11" y2="12.2" stroke="currentColor" strokeWidth="1.4"/></svg>
              Refresh Graph
            </button>
            <button
              onClick={onOpenControls}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 text-xs font-semibold text-white/80 transition hover:bg-white/14 hover:text-white active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-70"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="13" cy="8" r="2" fill="currentColor"/><circle cx="10" cy="12" r="2" fill="currentColor"/></svg>
              Controls
            </button>
          </div>

          <p className="text-center text-[10px] text-white/25">
            Live data from{" "}
            <code className="rounded bg-white/8 px-1 text-white/40">/init</code>
            {" "}and{" "}
            <code className="rounded bg-white/8 px-1 text-white/40">/api/langgraph/*</code>
          </p>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
    </header>
  );
}

function StatPill({ label, value, mono = false, truncate = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/70 backdrop-blur-sm">
      <span className="text-white/40">{label}</span>
      <span className={`font-bold text-white/90 ${mono ? "font-mono" : ""} ${truncate ? "max-w-[160px] truncate" : "tabular-nums"}`}>
        {value}
      </span>
    </span>
  );
}
