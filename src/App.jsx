import { useEffect, useMemo, useState } from "react";
import ExecutionControlsModal from "./components/ExecutionControlsModal";
import LoadingOverlay from "./components/LoadingOverlay";
import RawSnapshotModal from "./components/RawSnapshotModal";
import StateTimelinePanel from "./components/StateTimelinePanel";
import ThreadPanel from "./components/ThreadPanel";
import TopBar from "./components/TopBar";
import robotPng from "./assets/robot.png";
import { studioApi } from "./api/studioApi";
import {
  cleanMermaidSource,
  compareThreadsBySort,
  DEFAULT_NODES,
  extractContextFromPayload,
  extractContextFromSnapshots,
  firstDefined,
  getSectionValue,
  getStateSections,
  getValueType,
  isPlainObject,
  loadMermaidLibrary,
  mergeContext,
  normalizeThread,
  summarizeValue,
  toRequestedById,
  safeJson
} from "./utils/studioUtils";

export default function App() {
  const [threads, setThreads] = useState([]);
  const [graphMermaid, setGraphMermaid] = useState("");
  const [graphSvg, setGraphSvg] = useState("");
  const [graphRenderError, setGraphRenderError] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadFilter, setThreadFilter] = useState("");
  const [threadSort, setThreadSort] = useState("states_desc");

  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const [selectedStateSectionKey, setSelectedStateSectionKey] = useState("__overview");

  const [startNodes, setStartNodes] = useState(DEFAULT_NODES);

  const [resumeForm, setResumeForm] = useState({
    campaignId: "",
    domainName: "",
    startNode: "save_leads",
    strategyMode: "TABLE_POLICY",
    requestedBy: "admin",
    testMode: false,
    webhookData: ""
  });

  const [rerunForm, setRerunForm] = useState({
    parentCampaignId: "",
    domainName: "",
    startNode: "send_to_aibrain",
    strategyMode: "TABLE_POLICY",
    requestedBy: "admin",
    testMode: false,
    rerunReason: "manual rerun"
  });

  const [status, setStatus] = useState({ type: "neutral", message: "Ready" });
  const [controlsOpen, setControlsOpen] = useState(false);
  const [rawSnapshotOverlayOpen, setRawSnapshotOverlayOpen] = useState(false);

  const filteredThreads = useMemo(() => {
    const query = threadFilter.trim().toLowerCase();
    const filtered = !query
      ? [...threads]
      : threads.filter((thread) => {
          const campaignText =
            thread.campaignId === null || thread.campaignId === undefined
              ? ""
              : String(thread.campaignId).toLowerCase();
          const domainText = (thread.domainName ?? "").toLowerCase();
          return campaignText.includes(query) || domainText.includes(query);
        });

    filtered.sort((a, b) => compareThreadsBySort(a, b, threadSort));

    return filtered;
  }, [threads, threadFilter, threadSort]);

  const nestedThreads = useMemo(() => {
    const byCampaignId = new Map();
    for (const thread of filteredThreads) {
      if (thread.campaignId != null && !byCampaignId.has(thread.campaignId)) {
        byCampaignId.set(thread.campaignId, thread);
      }
    }

    const childrenByParentThreadId = new Map();
    const roots = [];

    for (const thread of filteredThreads) {
      if (
        thread.threadType === "RERUN" &&
        thread.parentCampaignId != null &&
        byCampaignId.has(thread.parentCampaignId)
      ) {
        const parentThread = byCampaignId.get(thread.parentCampaignId);
        if (parentThread.threadId !== thread.threadId) {
          const list = childrenByParentThreadId.get(parentThread.threadId) ?? [];
          list.push(thread);
          childrenByParentThreadId.set(parentThread.threadId, list);
          continue;
        }
      }
      roots.push(thread);
    }

    const sortedRoots = [...roots].sort((a, b) => compareThreadsBySort(a, b, threadSort));

    const out = [];
    for (const root of sortedRoots) {
      out.push({ thread: root, depth: 0 });
      const children = [...(childrenByParentThreadId.get(root.threadId) ?? [])].sort((a, b) =>
        compareThreadsBySort(a, b, threadSort)
      );
      for (const child of children) {
        out.push({ thread: child, depth: 1 });
      }
    }
    return out;
  }, [filteredThreads, threadSort]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId),
    [threads, selectedThreadId]
  );

  const totalExecutions = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.executions.length, 0),
    [threads]
  );

  const totalStates = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.snapshotCount, 0),
    [threads]
  );

  const selectedExecution = useMemo(() => {
    if (!selectedThread) {
      return null;
    }
    return selectedThread.executions[0] ?? null;
  }, [selectedThread]);

  const selectedState = useMemo(() => {
    if (!selectedExecution) {
      return null;
    }
    return selectedExecution.snapshots[selectedStateIndex] ?? selectedExecution.snapshots[0] ?? null;
  }, [selectedExecution, selectedStateIndex]);

  const executionSnapshots = selectedExecution?.snapshots ?? [];

  const timelineEntries = useMemo(() => {
    const nodeExecutions = selectedThread?.domainGraphNodeExecutions ?? [];
    if (nodeExecutions.length > 0) {
      const snapshotIndexesByNode = new Map();
      for (const snapshot of executionSnapshots) {
        const list = snapshotIndexesByNode.get(snapshot.node) ?? [];
        list.push(snapshot.index);
        snapshotIndexesByNode.set(snapshot.node, list);
      }
      const matchedPerNode = new Map();

      return nodeExecutions.map((nodeExecution, index) => {
        const nodeName = nodeExecution.nodeName;
        const indexes = snapshotIndexesByNode.get(nodeName) ?? [];
        const usedCount = matchedPerNode.get(nodeName) ?? 0;
        const snapshotIndex = indexes[usedCount] ?? null;
        matchedPerNode.set(nodeName, usedCount + 1);
        const matchingSnapshot =
          typeof snapshotIndex === "number"
            ? executionSnapshots.find((snapshot) => snapshot.index === snapshotIndex) ?? null
            : null;
        return {
          key: nodeExecution.id ? `node_execution_${nodeExecution.id}` : `node_execution_${index}`,
          node: nodeName,
          status: nodeExecution.status,
          attemptNo: nodeExecution.attemptNo,
          rowsWritten: nodeExecution.rowsWritten,
          errorMessage: nodeExecution.errorMessage,
          checkpoint: matchingSnapshot?.checkpoint ?? null,
          snapshotIndex,
          isResumePhase: matchingSnapshot?.isResumePhase ?? null,
          phase: matchingSnapshot?.phase ?? null,
          source: "nodeExecution"
        };
      });
    }

    return executionSnapshots.map((snapshot) => ({
      key: snapshot.key,
      node: snapshot.node,
      status: null,
      attemptNo: null,
      rowsWritten: null,
      errorMessage: null,
      checkpoint: snapshot.checkpoint,
      snapshotIndex: snapshot.index,
      isResumePhase: snapshot.isResumePhase,
      phase: snapshot.phase,
      source: "snapshot"
    }));
  }, [selectedThread, executionSnapshots]);

  const selectedTimelinePosition = useMemo(() => {
    if (!selectedState || timelineEntries.length === 0) {
      return 0;
    }
    const index = timelineEntries.findIndex((entry) => entry.snapshotIndex === selectedState.index);
    return index >= 0 ? index + 1 : 0;
  }, [selectedState, timelineEntries]);

  const selectedExecutionUniqueNodeCount = useMemo(
    () => new Set(timelineEntries.map((entry) => entry.node)).size,
    [timelineEntries]
  );

  function applyContextToForms(context) {
    if (!context) {
      return;
    }

    const nodes =
      Array.isArray(context.startNodes) && context.startNodes.length
        ? context.startNodes
        : DEFAULT_NODES;
    setStartNodes(nodes);

    setResumeForm((prev) => ({
      ...prev,
      campaignId: firstDefined(context.campaignId, prev.campaignId, ""),
      domainName: firstDefined(context.domainName, prev.domainName, ""),
      startNode: firstDefined(context.suggestedResumeStartNode, context.startNode, prev.startNode),
      strategyMode: firstDefined(context.strategyMode, prev.strategyMode, "TABLE_POLICY"),
      requestedBy: firstDefined(context.requestedBy, prev.requestedBy, "")
    }));

    setRerunForm((prev) => ({
      ...prev,
      parentCampaignId: firstDefined(
        context.parentCampaignIdForRerun,
        context.parentCampaignId,
        context.campaignId,
        prev.parentCampaignId,
        ""
      ),
      domainName: firstDefined(context.domainName, prev.domainName, ""),
      startNode: firstDefined(context.suggestedRerunStartNode, context.startNode, prev.startNode),
      strategyMode: firstDefined(context.strategyMode, prev.strategyMode, "TABLE_POLICY"),
      requestedBy: firstDefined(context.requestedBy, prev.requestedBy, "")
    }));
  }

  const stateSections = useMemo(() => getStateSections(selectedState?.payload), [selectedState]);

  const selectedSectionValue = useMemo(
    () => getSectionValue(selectedState?.payload, selectedStateSectionKey),
    [selectedState, selectedStateSectionKey]
  );

  const stateOverview = useMemo(() => {
    if (!selectedState) {
      return [];
    }
    const payload = selectedState.payload;
    if (isPlainObject(payload)) {
      return Object.entries(payload).map(([key, value]) => ({
        key,
        type: getValueType(value),
        summary: summarizeValue(value)
      }));
    }
    return [
      {
        key: "payload",
        type: getValueType(payload),
        summary: summarizeValue(payload)
      }
    ];
  }, [selectedState]);

  async function fetchGraphMermaid() {
    try {
      const mermaid = await studioApi.fetchGraphMermaid();
      setGraphMermaid(mermaid);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to fetch graph" });
    }
  }

  async function loadStudioState() {
    setLoading(true);
    setStatus({ type: "neutral", message: "Loading threads and state history..." });

    try {
      const payload = await studioApi.loadStudioState();
      const normalizedThreads = (Array.isArray(payload.threads) ? payload.threads : [])
        .map(normalizeThread)
        .filter(Boolean);

      setThreads(normalizedThreads);

      if (normalizedThreads.length > 0) {
        const preferred = normalizedThreads.some((thread) => thread.threadId === selectedThreadId)
          ? selectedThreadId
          : normalizedThreads[0].threadId;

        setSelectedThreadId(preferred);
        setSelectedStateIndex(0);

        setStatus({
          type: "success",
          message: `Loaded ${normalizedThreads.length} thread(s) from studio checkpoint history.`
        });
      } else {
        setSelectedThreadId("");
        setStatus({ type: "neutral", message: "No persisted threads found." });
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to load studio state" });
    } finally {
      setLoading(false);
    }
  }

  async function hydrateFromSelectedThread() {
    if (!selectedThreadId) {
      setStatus({ type: "error", message: "Select a thread before loading execution context." });
      return;
    }

    setStatus({ type: "neutral", message: `Loading execution context for ${selectedThreadId}...` });

    try {
      const data = await studioApi.fetchExecutionContext(selectedThreadId);

      applyContextToForms(data);

      setStatus({
        type: "success",
        message: `Context loaded for ${selectedThreadId}. Resume and rerun forms are pre-filled.`
      });
    } catch (error) {
      const fromExecution = extractContextFromSnapshots(selectedExecution?.snapshots);
      const fromSelected = extractContextFromPayload(selectedState?.payload, selectedState?.node);
      const fallbackContext = mergeContext(fromExecution, fromSelected);

      if (fallbackContext) {
        applyContextToForms(fallbackContext);

        const hasCore = Boolean(fallbackContext.campaignId) && Boolean(fallbackContext.domainName);
        const missing = [];
        if (!fallbackContext.campaignId) {
          missing.push("campaignId");
        }
        if (!fallbackContext.domainName) {
          missing.push("domainName");
        }
        if (!fallbackContext.parentCampaignIdForRerun) {
          missing.push("parentCampaignId");
        }

        setStatus({
          type: hasCore ? "success" : "neutral",
          message: hasCore
            ? "Context loaded from checkpoint state history."
            : `Context partially loaded from state history (missing: ${missing.join(", ")}).`
        });
        return;
      }

      setStatus({
        type: "error",
        message:
          (error.message || "Failed to load execution context") +
          ". Common causes: backend not restarted, thread has no domain_graph_execution row, or placeholder thread selected."
      });
    }
  }

  async function submitResume() {
    if (!resumeForm.campaignId || !resumeForm.domainName) {
      setStatus({ type: "error", message: "Resume requires campaignId and domainName." });
      return;
    }

    let webhookData = null;
    if (resumeForm.webhookData.trim()) {
      try {
        webhookData = JSON.parse(resumeForm.webhookData);
      } catch {
        setStatus({ type: "error", message: "Webhook JSON is invalid." });
        return;
      }
    }

    const payload = {
      campaignId: Number(resumeForm.campaignId),
      domainName: resumeForm.domainName.trim().toLowerCase(),
      startNode: resumeForm.startNode,
      strategyMode: resumeForm.strategyMode,
      testMode: resumeForm.testMode
    };

    const requestedById = toRequestedById(resumeForm.requestedBy);
    if (requestedById !== null) {
      payload.requestedBy = requestedById;
    }
    if (webhookData) {
      payload.webhookData = webhookData;
    }

    setStatus({ type: "neutral", message: "Sending resume request..." });

    try {
      const data = await studioApi.submitResume(payload);

      setStatus({
        type: "success",
        message: `Resume started. executionId=${data.executionId}, campaignId=${data.campaignId}, domainId=${data.domainId}`
      });

      await loadStudioState();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Resume failed" });
    }
  }

  async function submitRerun() {
    if (!rerunForm.parentCampaignId || !rerunForm.domainName) {
      setStatus({ type: "error", message: "Rerun requires parentCampaignId and domainName." });
      return;
    }

    const payload = {
      parentCampaignId: Number(rerunForm.parentCampaignId),
      domainName: rerunForm.domainName.trim().toLowerCase(),
      startNode: rerunForm.startNode,
      strategyMode: rerunForm.strategyMode,
      testMode: rerunForm.testMode,
      rerunReason: rerunForm.rerunReason?.trim() || "manual rerun"
    };

    const requestedById = toRequestedById(rerunForm.requestedBy);
    if (requestedById !== null) {
      payload.requestedBy = requestedById;
    }

    setStatus({ type: "neutral", message: "Sending rerun request..." });

    try {
      const data = await studioApi.submitRerun(payload);

      setStatus({
        type: "success",
        message: `Rerun started. executionId=${data.executionId}, newCampaignId=${data.campaignId}`
      });

      await loadStudioState();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Rerun failed" });
    }
  }

  useEffect(() => {
    loadStudioState();
    fetchGraphMermaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderGraph() {
      const mermaidSource = cleanMermaidSource(graphMermaid);
      if (!mermaidSource) {
        setGraphSvg("");
        setGraphRenderError("");
        return;
      }

      try {
        const mermaid = await loadMermaidLibrary();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
            primaryColor: "#e7f4fb",
            primaryBorderColor: "#3b7fa8",
            primaryTextColor: "#12334a",
            lineColor: "#2f6f93",
            tertiaryColor: "#edf9f6"
          }
        });

        const renderId = `domain_graph_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const output = await mermaid.render(renderId, mermaidSource);
        if (!cancelled) {
          setGraphSvg(output.svg);
          setGraphRenderError("");
        }
      } catch (error) {
        if (!cancelled) {
          setGraphSvg("");
          setGraphRenderError(error.message || "Graph rendering failed");
        }
      }
    }

    renderGraph();

    return () => {
      cancelled = true;
    };
  }, [graphMermaid]);

  useEffect(() => {
    setSelectedStateSectionKey("__overview");
  }, [selectedState?.key]);

  useEffect(() => {
    if (!controlsOpen && !rawSnapshotOverlayOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (rawSnapshotOverlayOpen) {
          setRawSnapshotOverlayOpen(false);
          return;
        }
        setControlsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controlsOpen, rawSnapshotOverlayOpen]);

  useEffect(() => {
    if (!controlsOpen && !rawSnapshotOverlayOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [controlsOpen, rawSnapshotOverlayOpen]);

  return (
    <div className="relative mx-auto max-w-[1680px] px-4 py-5 pb-24">
      <TopBar
        loading={loading}
        onOpenControls={() => setControlsOpen(true)}
        onRefreshData={loadStudioState}
        onRefreshGraph={fetchGraphMermaid}
        selectedThreadId={selectedThreadId}
        totalExecutions={totalExecutions}
        totalStates={totalStates}
        threadsCount={threads.length}
      />

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <ThreadPanel
          filteredThreads={filteredThreads}
          nestedThreads={nestedThreads}
          onCopyThreadId={(threadId) => {
            navigator.clipboard?.writeText(threadId);
            setStatus({ type: "success", message: `Copied thread ID: ${threadId}` });
          }}
          onSelectThread={(threadId) => {
            setSelectedThreadId(threadId);
            setSelectedStateIndex(0);
          }}
          selectedThread={selectedThread}
          selectedThreadId={selectedThreadId}
          threadFilter={threadFilter}
          threadSort={threadSort}
          setThreadFilter={setThreadFilter}
          setThreadSort={setThreadSort}
        />

        <StateTimelinePanel
          executionSnapshots={executionSnapshots}
          timelineEntries={timelineEntries}
          onOpenRawSnapshot={() => setRawSnapshotOverlayOpen(true)}
          onSelectState={setSelectedStateIndex}
          selectedExecution={selectedExecution}
          selectedExecutionUniqueNodeCount={selectedExecutionUniqueNodeCount}
          selectedSectionValue={selectedSectionValue}
          selectedState={selectedState}
          selectedStatePosition={selectedTimelinePosition}
          selectedStateSectionKey={selectedStateSectionKey}
          setSelectedStateSectionKey={setSelectedStateSectionKey}
          stateOverview={stateOverview}
          stateSections={stateSections}
        />
      </main>

      {!controlsOpen && (
        <button
          type="button"
          aria-label="Open Execution Controls"
          title="Open Execution Controls"
          className="group fixed bottom-5 right-5 z-40 rounded-full p-0 transition-transform duration-200 hover:scale-105"
          onClick={() => setControlsOpen(true)}
        >
          <span className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-[conic-gradient(from_90deg,_#38bdf8,_#22d3ee,_#34d399,_#60a5fa,_#38bdf8)] opacity-80 blur-md animate-[spin_2.4s_linear_infinite]" />
          <span className="pointer-events-none absolute -inset-2 -z-10 rounded-full border-2 border-cyan-300/70 border-t-emerald-300 border-r-blue-300 animate-[spin_1.6s_linear_infinite]" />
          <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full border border-sky-200/70 border-b-teal-300 animate-[spin_2.8s_linear_infinite_reverse]" />
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-sky-300/25 blur-sm animate-pulse" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full border border-sky-300 bg-slate-900/85 shadow-[0_14px_28px_rgba(9,44,63,0.35)]">
            <img
              src={robotPng}
              alt="Open Execution Controls"
              className="h-12 w-12 rounded-full object-contain"
            />
          </div>
        </button>
      )}

      <ExecutionControlsModal
        controlsOpen={controlsOpen}
        graphMermaid={graphMermaid}
        graphRenderError={graphRenderError}
        graphSvg={graphSvg}
        hydrateFromSelectedThread={hydrateFromSelectedThread}
        onClose={() => setControlsOpen(false)}
        rerunForm={rerunForm}
        resumeForm={resumeForm}
        setRerunForm={setRerunForm}
        setResumeForm={setResumeForm}
        startNodes={startNodes}
        status={status}
        submitRerun={submitRerun}
        submitResume={submitResume}
      />

      <RawSnapshotModal
        onClose={() => setRawSnapshotOverlayOpen(false)}
        onCopy={() => {
          const text = selectedState ? safeJson(selectedState.raw) : "";
          if (!text) {
            return;
          }
          navigator.clipboard?.writeText(text);
          setStatus({ type: "success", message: "Raw snapshot JSON copied." });
        }}
        rawSnapshotOverlayOpen={rawSnapshotOverlayOpen}
        selectedState={selectedState}
      />

      <LoadingOverlay visible={loading} message="Syncing thread history and state timeline..." />
    </div>
  );
}
