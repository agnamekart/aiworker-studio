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
    <header className="topbar">
      <div className="hero-copy">
        <div className="hero-kicker-row">
          <span className="hero-kicker">LangGraph Runtime</span>
          <span className="hero-sep" />
          <span className="hero-kicker subtle">Observability + Control</span>
        </div>

        <h1>AI Worker Studio</h1>
        <p>Operational dashboard for thread history, state inspection, and execution control.</p>

        <div className="metric-row">
          <span className="metric-pill">Threads {threadsCount}</span>
          <span className="metric-pill">Executions {totalExecutions}</span>
          <span className="metric-pill">States {totalStates}</span>
          <span className="metric-pill soft">Selected {selectedThreadId || "none"}</span>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar">
          <button className="primary topbar-btn" onClick={onRefreshData} disabled={loading}>
            Refresh Data
          </button>
          <button className="ghost topbar-btn" onClick={onRefreshGraph}>
            Refresh Graph
          </button>
          <button className="ghost topbar-btn" onClick={onOpenControls}>
            Execution Controls
          </button>
        </div>
        <p className="toolbar-note">
          Live data from <code>/init</code> and <code>/api/langgraph/*</code>
        </p>
      </div>
    </header>
  );
}
